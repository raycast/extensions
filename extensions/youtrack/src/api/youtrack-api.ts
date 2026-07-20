import type {
  Command,
  CommandSuggestions,
  Comment,
  Issue,
  IssueExtended,
  IssueTag,
  Project,
  User,
  WorkItem,
} from "../interfaces";
import { formatDate, getUserAvatar, isDurationValue, transformCustomFieldValue } from "../utils";
import getYouTrackClientInstance from "./youtrack-client";
import type { SingleUserIssueCustomField, WorkItemType, YouTrack } from "youtrack-client";
import type {
  WorkItemFields,
  ExtendedIssuesFields,
  IssuesFields,
  ProjectFields,
  ReducedApiIssue,
  IssueWorkItemFields,
  UserFields,
  IssueComment,
} from "./youtrack-api-types";
import {
  commandListFields,
  commentFields,
  createIssueFields,
  extendedIssuesFields,
  issuesFields,
  issueWorkItemFields,
  projectFields,
  tagsFields,
  userFields,
  workItemFields,
} from "./youtrack-api-fields";
import type { FetchedUser, NewIssue } from "../types";

type FetchedFavorites = { fetched: Project[]; errored: string[] };

let instance: YouTrackApi | null = null;

export class YouTrackApi {
  private yt: YouTrack;

  private constructor() {
    this.yt = getYouTrackClientInstance();
  }

  // Singleton getInstance method
  static getInstance(): YouTrackApi {
    if (!instance) {
      instance = new YouTrackApi();
    }
    return instance;
  }

  async fetchIssues(query: string, limit: number): Promise<Issue[]> {
    const data = await this.yt.Issues.getIssues<IssuesFields>({
      fields: issuesFields,
      query,
      $top: limit,
    });

    return data.map((issue) => ({
      id: issue.idReadable,
      summary: issue.summary ?? "",
      date: new Date(issue.updated).toDateString(),
      created: new Date(issue.created).toDateString(),
      resolved: Boolean(issue.resolved),
      description: issue.description ?? "",
      customFields:
        issue.customFields
          ?.filter((field) => ["Type", "State", "Priority"].includes(field.name))
          .map((field) => ({
            id: field.id,
            name: field.name,
            value: transformCustomFieldValue(field.value),
          })) ?? [],
      project: { name: issue.project!.name!, shortName: issue.project!.shortName!, id: issue.project!.id },
    }));
  }

  async fetchProjects(limit: number): Promise<Project[]> {
    const projects = await this.yt.Admin.Projects.getProjects<ProjectFields>({ fields: projectFields, $top: limit });
    return projects.map((project) => ({
      id: project.id,
      shortName: project.shortName!,
      name: project.name!,
    }));
  }

  async fetchTags(limit: number): Promise<IssueTag[]> {
    const tags = await this.yt.Tags.getTags({ fields: tagsFields, $top: limit });
    return tags.filter((tag): tag is IssueTag => tag?.name !== "Star");
  }

  async fetchProjectById(id: string): Promise<Project> {
    const project = await this.yt.Admin.Projects.getProjectById<ProjectFields>(id, { fields: projectFields });
    return {
      id: project.id,
      shortName: project.shortName!,
      name: project.name!,
    };
  }

  async createIssue(issue: NewIssue): Promise<ReducedApiIssue> {
    const {
      summary,
      description,
      project: { id },
      tags,
    } = issue;
    const newIssue = await this.yt.Issues.createIssue(
      { summary, description, project: { id }, tags },
      { fields: createIssueFields },
    );
    return newIssue;
  }

  async applyCommandToIssue(issueId: string, { command: query, comment, silent = true }: Command): Promise<void> {
    await this.yt.Commands.applyCommandToIssues({ issues: [{ idReadable: issueId }], query, silent, comment });
  }

  async getCommandSuggestions(issueId: string, { command: query }: Command): Promise<CommandSuggestions> {
    return await this.yt.Commands.getCommandSuggestions(
      {
        issues: [{ idReadable: issueId }],
        query,
      },
      { fields: commandListFields },
    );
  }

  async fetchIssueDetails(issue: Issue): Promise<IssueExtended | void> {
    const issueDetails = await this.yt.Issues.getIssueById<ExtendedIssuesFields>(issue.id, {
      fields: extendedIssuesFields,
    });
    const assignee: FetchedUser | null =
      issueDetails.customFields?.find((field): field is SingleUserIssueCustomField => field.name === "Assignee")
        ?.value ?? null;
    const { reporter, updater, tags, created, updated, attachments, project } = issueDetails;
    if (!project) {
      return;
    }
    return {
      ...issue,
      attachments,
      date: formatDate(updated ?? 0),
      created: formatDate(created ?? 0),
      assignee: assignee ? { ...assignee, avatarUrl: getUserAvatar(assignee.avatarUrl, this.yt.baseUrl) } : null,
      reporter: reporter ? { ...reporter, avatarUrl: getUserAvatar(reporter.avatarUrl, this.yt.baseUrl) } : null,
      updater: updater ? { ...updater, avatarUrl: getUserAvatar(updater.avatarUrl, this.yt.baseUrl) } : null,
      tags: tags.map((tag) => ({ ...tag, name: tag.name ?? "" })),
      workItemTypes: await this.yt.Admin.Projects.getProjectWorkItemTypes<WorkItemFields>(project.id, {
        fields: workItemFields,
      }),
    };
  }

  async fetchFavorites(favorites: string[]): Promise<FetchedFavorites> {
    const favoriteProjects: FetchedFavorites = { fetched: [], errored: [] };

    for (const projectId of favorites) {
      try {
        const fetchedProject = await this.fetchProjectById(projectId);
        favoriteProjects.fetched.push(fetchedProject);
      } catch {
        favoriteProjects.errored.push(projectId);
      }
    }

    return favoriteProjects;
  }

  async createWorkItem(issue: Issue, workItem: WorkItem) {
    if (!issue.project || !isDurationValue(workItem.duration.presentation)) {
      return;
    }
    await this.yt.IssueTimeTracking.createIssueWorkItem<IssueWorkItemFields>(
      issue.id,
      {
        duration: { presentation: workItem.duration.presentation },
        date: workItem.date,
        type: workItem.type as WorkItemType,
        text: workItem.text,
      },
      { fields: issueWorkItemFields },
    );
  }

  async fetchUsers(): Promise<User[]> {
    const users = await this.yt.Users.getUsers<UserFields>({ fields: userFields, $top: -1 });
    return users.map((user) => ({
      ...user,
      avatarUrl: getUserAvatar(user.avatarUrl, this.yt.baseUrl),
    }));
  }

  async fetchSelf(): Promise<User> {
    return await this.yt.Users.getCurrentUserProfile<UserFields>({ fields: userFields });
  }

  async fetchComments(issueId: string, { top }: { top?: number } = {}): Promise<Comment[]> {
    return await this.yt.IssueComments.getIssueComments<IssueComment>(issueId, {
      fields: commentFields,
      $top: top,
    }).then((comments) =>
      comments.map((comment) => ({
        ...comment,
        text: comment.text ?? "",
      })),
    );
  }

  async deleteIssue(issueId: string): Promise<void> {
    try {
      await this.yt.Issues.deleteIssue(issueId);
    } catch (error) {
      // If the error is a SyntaxError from parsing empty response and the request was successful (204 No Content)
      // we can safely ignore it as this is the expected behavior for DELETE operations
      if (error instanceof SyntaxError && error.message.includes("Unexpected end of JSON input")) {
        return;
      }
      throw error;
    }
  }
}
