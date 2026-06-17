import fetch, { RequestInit, Response, Headers } from "node-fetch";
import http from "http";
import https from "https";
import { GerritInstance } from "../../interfaces/gerrit";
import { Project, ProjectBranch } from "../../interfaces/project";
import { Change, Label, ChangeSubmitRequirement } from "../../interfaces/change";
import { User, UserVote } from "../../interfaces/user";

// Gerrit API adds a magic prefix to response,
// refer to: https://gerrit-review.googlesource.com/Documentation/rest-api.html#output
const MagicPrefixEnd = 5;

const GerritChangesParameters = [
  "CURRENT_REVISION",
  "DETAILED_LABELS",
  "SUBMIT_REQUIREMENTS",
  "CURRENT_COMMIT",
  "DETAILED_ACCOUNTS",
  "SKIP_DIFFSTAT",
  "SUBMITTABLE",
];

export class GerritAPI {
  public gerrit: GerritInstance;

  constructor(g: GerritInstance) {
    this.gerrit = g;
  }

  public async inspect(): Promise<Response> {
    const instanceUrl = new URL(this.gerrit.url);
    this.gerrit.version = (await this.request(new URL(`${this.gerrit.url}/config/server/version`))).replaceAll('"', "");
    this.gerrit.password && this.gerrit.username
      ? (instanceUrl.pathname += "/a/config/server/preferences")
      : (instanceUrl.pathname += "/config/server/info");
    const result = JSON.parse(await this.request(instanceUrl));
    return result;
  }

  public async getChanges(q: string) {
    const instanceUrl = new URL(this.gerrit.url);
    instanceUrl.pathname += this.gerrit.authorized ? "/a/changes/" : "/changes/";
    // If user is authenticated with API, return results mimicking personal dashboard
    if (!q && this.gerrit.authorized) {
      instanceUrl.search = "q=(owner:self AND is:open) OR (attention:self) OR (reviewer:self AND is:open)";
    }
    // If user is not authenticated, return 50 latest public open resulst
    else if (!q && !this.gerrit.authorized) {
      instanceUrl.search = `q=(status:open -is:wip limit:50)`;
    } else if (q) {
      instanceUrl.search = `q=${q}`;
    }
    GerritChangesParameters.map((gerritParam: string) => instanceUrl.searchParams.append("o", gerritParam));
    const openChangees = JSON.parse(await this.request(instanceUrl));
    // const openChangees = JSON.parse(resp);
    return openChangees.map((change: Change) => {
      const calculatedLabels: Label[] = [];
      // change.topic = change["topic"] ? change["topic"] : "";
      change.url = `${this.gerrit.url}/c/${change.project}/+/${change._number}`.replace(/([^:]\/)\/+/g, "$1");
      change.commitMessage = change.revisions[change.current_revision].commit.message;
      change.author = change.revisions[change.current_revision].commit.author;
      change.committer = change.revisions[change.current_revision].commit.committer;
      change.uploader = change.revisions[change.current_revision].uploader;
      change.ref = change.revisions[change.current_revision].ref;
      // If value is undefined, we can not assume that a patch is unmergeable
      change.mergeable = change.mergeable === undefined || change.mergeable ? true : false;
      change.changeReviewers = change.reviewers["REVIEWER"]
        ? change.reviewers["REVIEWER"].map((r: User) => {
            return r;
          })
        : [];
      for (const label in change.labels) {
        let calculatedCurrentVote = 0;
        let labelStatus = "none";
        let parsedVoteValues: number[] = [];
        // Iterate over all user votes for each label
        parsedVoteValues = change.labels[label]["all"]
          ? change.labels[label]["all"].map((vote: UserVote) => {
              return vote.value ? vote.value : 0;
            })
          : [];
        // Default Gerrit votes range from +2 to -2
        // The combined label vote is calculated in the following order:
        // REJECTED (-2) > APPROVED (+2) > DISLIKED (-1) > RECOMMENDED (+1)
        if (parsedVoteValues.includes(-2)) {
          calculatedCurrentVote = -2;
          labelStatus = "rejected";
        } else if (parsedVoteValues.includes(2)) {
          calculatedCurrentVote = 2;
          labelStatus = "approved";
        } else if (parsedVoteValues.includes(-1)) {
          calculatedCurrentVote = -1;
          labelStatus = "disliked";
        } else if (parsedVoteValues.includes(1)) {
          calculatedCurrentVote = 1;
          labelStatus = "recommended";
        }
        const calculatedLabel: Label = {
          name: label,
          value: calculatedCurrentVote,
          status: labelStatus,
        };
        calculatedLabels.push(calculatedLabel);
      }
      const requirementsStatus: string[] = change.submit_requirements
        ? Array.from(
            new Set(
              change.submit_requirements?.map((r: ChangeSubmitRequirement) => {
                return r.status;
              })
            )
          )
        : [];
      // Remove "NOT_APPLICABLE"
      requirementsStatus.indexOf("NOT_APPLICABLE") !== -1 &&
        requirementsStatus.splice(requirementsStatus.indexOf("NOT_APPLICABLE"), 1);
      change.submitRequirementsMet =
        requirementsStatus.length > 0
          ? requirementsStatus.length == 1 && requirementsStatus[0] == "SATISFIED" && !change.work_in_progress
            ? true
            : false
          : undefined;
      change.calculatedVoteLabels = calculatedLabels;
      this.notifyWarnigs(change);
      return change;
    });
  }

  public async getProjects(projectQuery: string) {
    const instanceUrl = new URL(this.gerrit.url);
    instanceUrl.pathname += this.gerrit.authorized ? "/a/projects/" : "/projects/";
    instanceUrl.search = projectQuery ? `query=${projectQuery}` : "d";
    const projects = JSON.parse(await this.request(instanceUrl));
    const gerritProjects: Project[] = [];
    for (const project in projects) {
      projects[project].url = `${this.gerrit.url}/admin/repos/${projects[project].id}`.replace(/([^:]\/)\/+/g, "$1");
      projects[project].id = decodeURIComponent(projects[project].id);
      gerritProjects.push(projects[project]);
    }
    return gerritProjects;
  }

  public async getProjectBranches(project: Project) {
    const instanceUrl = new URL(this.gerrit.url);
    instanceUrl.pathname += this.gerrit.authorized ? "/a/projects/" : "/projects/";
    instanceUrl.pathname += `${encodeURIComponent(project.id)}/branches`;
    const listBranches = JSON.parse(await this.request(instanceUrl));
    return listBranches.map((branch: ProjectBranch) => {
      const remoteRefs = branch.ref.split("/");
      branch.name = remoteRefs.length > 1 ? remoteRefs[remoteRefs.length - 1] : branch.ref;
      return branch;
    });
  }

  notifyWarnigs(change: Change) {
    change.apiWarnings = [];
    change.submitRequirementsMet === undefined
      ? change.apiWarnings.push("No available info on submit requirements")
      : null;
  }

  async request(url: URL, init?: RequestInit) {
    let urlAgent;
    if (url.toString().startsWith("http://")) {
      new http.Agent({});
    } else if (url.toString().startsWith("https://")) {
      new https.Agent({ rejectUnauthorized: !this.gerrit.unsafeHttps });
    } else {
      return Promise.reject(new Error("Wrong scheme in URL"));
    }
    let headers: Headers | undefined = undefined;
    url.href = url.href.replace(/([^:]\/)\/+/g, "$1");
    if (this.gerrit.password) {
      headers = new Headers();
      headers.append(
        "Authorization",
        "Basic " + Buffer.from(`${this.gerrit.username}:${this.gerrit.password}`).toString("base64")
      );
    }
    const resp = await fetch(url, {
      headers,
      method: "GET",
      agent: urlAgent,
      ...init,
    });
    if (!resp.ok) {
      if (resp.status === 401) {
        return Promise.reject(new Error("Invalid credentials"));
      } else if (resp.status == 403) {
        return Promise.reject(new Error("Forbidden"));
      }
      return Promise.reject(`${resp.status} ${await resp.text()}`);
    }
    if (this.gerrit.password) {
      this.gerrit.authorized = true;
    } else {
      this.gerrit.authorized = false;
    }
    return (await resp.text()).toString().substring(MagicPrefixEnd);
  }
}
