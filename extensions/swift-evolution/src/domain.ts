import { ProposalViewModel } from "./index";
import fetch from "node-fetch";
import { ProposalJson, fetchProposals as fetchRemoteProposals, Status } from "./api";

type DisplayableStatus = { display: string };

const displayableStatusMap: Record<Status, DisplayableStatus> = {
  ".awaitingReview": { display: "Awaiting Review" },
  ".scheduledForReview": { display: "Scheduled For Review" },
  ".activeReview": { display: "In Review" },
  ".accepted": { display: "Accepted" },
  ".acceptedWithRevisions": { display: "Accepted" },
  ".previewing": { display: "Previewing" },
  ".implemented": { display: "Implemented" },
  ".returnedForRevision": { display: "Returned" },
  ".deferred": { display: "Deferred" },
  ".rejected": { display: "Rejected" },
  ".withdrawn": { display: "Withdrawn" },
};

export async function fetchProposals(): Promise<ProposalViewModel[]> {
  const toUI = (proposals: ProposalJson[]): ProposalViewModel[] => {
    const proposalsViewModel: ProposalViewModel[] = proposals.map((x) => {
      return {
        id: x.id,
        authorName: x.authors.map(x => x.name).join(","),
        reviewManagerName: x.reviewManager.name,
        link: "https://github.com/apple/swift-evolution/blob/main/proposals/" + x.link,
        markdownLink: "https://raw.githubusercontent.com/apple/swift-evolution/main/proposals/" + x.link,
        keywords: getKeywords(x),
        repos: getRepos(x),
        status: getDisplayableStatus(x).display,
        title: x.title.trim(),
        swiftVersion: x.status.version
      };
    }).reverse();
    return proposalsViewModel;
  };

  const getDisplayableStatus = (proposal: ProposalJson): DisplayableStatus => {
    const jsonStatus = proposal.status.state;
    let display = displayableStatusMap[jsonStatus];
    if (display === undefined) {
      display = {
        display: jsonStatus,
      };
    }
    return display;
  };

  const getRepos = (proposal: ProposalJson) => {
    const repos = (proposal.implementation ?? []).map((x) => x.repository);
    return repos
      .reduce((repos, repo) => {
        if (repo === undefined) return repos;
        if (repos.includes(repo)) return repos;
        repos.push(repo);
        return repos;
      }, [] as string[])
      .join("|");
  };

  const getKeywords = (proposal: ProposalJson) => {
    const statusKeywords = getDisplayableStatus(proposal).display.split(" ");
    const summaryKeywords = proposal.summary.trim().split(" ");
    const titleKeywords = proposal.title.trim().split(" ");
    const repoKeywords = getRepos(proposal).split("|");
    const version = proposal.status.version?.trim()
    return [proposal.id, proposal.status.version, statusKeywords, summaryKeywords, titleKeywords, repoKeywords, version]
      .flat()
      .filter((x) => x !== undefined) as string[];
  };

  try {
    const json = await fetchRemoteProposals();
    return toUI(json);
  } catch (error) {
    console.error(error);
    return Promise.reject(error);
  }
}

export async function fetchMarkdown(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    return await response.text();
  } catch (error) {
    throw Promise.resolve(error);
  }
}
