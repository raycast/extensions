import type { User } from "@linear/sdk";

import type { IssueResult } from "../api/getIssues";
import type { Plain } from "../tools/serializers";

export function getUserMentionFilter(query: string) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return {
    active: { eq: true },
    app: { eq: false },
    ...(words.length
      ? {
          and: words.map((word) => ({
            or: [
              { name: { containsIgnoreCase: word } },
              { displayName: { containsIgnoreCase: word } },
              { email: { containsIgnoreCase: word } },
            ],
          })),
        }
      : {}),
  };
}

type MentionUser = Pick<User, "id" | "name" | "displayName" | "email" | "title" | "avatarUrl">;

export function toUserMentions(users: readonly MentionUser[], fallbackIcon: string) {
  return users.slice(0, 50).map((user) => ({
    title: user.displayName?.trim() || user.name || user.email,
    uri: `linear://users/${user.id}`,
    description: [user.email, user.title].filter(Boolean).join(" · "),
    icon: user.avatarUrl || fallbackIcon,
  }));
}

type MentionIssue = Pick<IssueResult, "id" | "identifier" | "title" | "state" | "project" | "assignee">;

export function toIssueMentions(issues: readonly MentionIssue[], icon: string) {
  return issues.slice(0, 50).map((issue) => ({
    title: `${issue.identifier} · ${issue.title}`,
    uri: `linear://issues/${issue.id}`,
    description: [issue.state.name, issue.project?.name, issue.assignee?.displayName].filter(Boolean).join(" · "),
    icon,
  }));
}

type ResourceKind = "users" | "issues";
type Readers = Record<ResourceKind, (id: string) => Promise<{ [key: string]: Plain }>>;

export async function readMentionResource(uri: string, readers: Readers) {
  const match =
    /^linear:\/\/(users|issues)\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.exec(
      uri,
    );
  if (!match) throw new Error("Invalid Linear resource URI.");
  const kind: ResourceKind = match[1] === "users" ? "users" : "issues";
  const id = match[2].toLowerCase();
  const data = await readers[kind](id);
  if (data.id !== id) throw new Error("This Linear resource is no longer available.");
  if (kind === "users" && (data.active !== true || data.app || data.archivedAt)) {
    throw new Error("This Linear user is no longer available.");
  }
  return { text: JSON.stringify(data, null, 2), mimeType: "application/json" };
}
