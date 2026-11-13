import type { User } from "@linear/sdk";

import type { IssueResult } from "../api/getIssues";
import type { MentionProjectResult } from "../api/getProjects";
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

/** Projects still in play: not completed or canceled. */
export const ACTIVE_PROJECT_MENTION_FILTER = { status: { type: { nin: ["completed", "canceled"] } } };

/** Active projects you lead or are a member of, which the empty Projects search lists first. */
export const MY_PROJECT_MENTION_FILTER = {
  and: [
    ACTIVE_PROJECT_MENTION_FILTER,
    { or: [{ lead: { isMe: { eq: true } } }, { members: { some: { isMe: { eq: true } } } }] },
  ],
};

/**
 * Every project whose name contains each query word, whatever its status or team, so a finished
 * project can still be referenced by name.
 */
export function getProjectMentionFilter(query: string) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return { and: words.map((word) => ({ name: { containsIgnoreCase: word } })) };
}

/** Your projects first, then the others, each keeping its own order, without repeats. */
export function mergeMentionProjects<T extends { id: string }>(mine: readonly T[], others: readonly T[]) {
  const seen = new Set<string>();
  return [...mine, ...others].filter((project) => {
    if (seen.has(project.id)) return false;
    seen.add(project.id);
    return true;
  });
}

/** A project row: its name, its status, and its own icon in its own color, as Linear shows it. */
export function toProjectMentions(
  projects: readonly MentionProjectResult[],
  icon: (project: MentionProjectResult) => string,
) {
  return projects.slice(0, 50).map((project) => ({
    title: project.name,
    uri: `linear://projects/${project.id}`,
    description: project.status?.name ?? "",
    icon: icon(project),
  }));
}

const HEX_COLOR = /^#[0-9a-f]{3,8}$/i;

/** The project's color when it is a hex color, the only form an SVG attribute safely takes. */
export function projectIconColor(color: string | null | undefined) {
  return color && HEX_COLOR.test(color) ? color.toLowerCase() : undefined;
}

/**
 * Paints a single-color Linear icon in the project's color, as Linear tints it: every fill, stroke,
 * and `--icon-color` becomes the color, and `none` stays transparent.
 */
export function tintProjectIconSvg(svg: string, color: string) {
  return svg
    .replace(/\b(fill|stroke)="(?!none")[^"]*"/gi, `$1="${color}"`)
    .replace(/--icon-color:\s*#[0-9a-f]{3,8}/gi, `--icon-color: ${color}`);
}

type ResourceKind = "users" | "issues" | "projects";
type Readers = Record<ResourceKind, (id: string) => Promise<{ [key: string]: Plain }>>;

export async function readMentionResource(uri: string, readers: Readers) {
  const match =
    /^linear:\/\/(users|issues|projects)\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.exec(
      uri,
    );
  if (!match) throw new Error("Invalid Linear resource URI.");
  const kind = match[1] as ResourceKind;
  const id = match[2].toLowerCase();
  const data = await readers[kind](id);
  if (data.id !== id) throw new Error("This Linear resource is no longer available.");
  if (kind === "users" && (data.active !== true || data.app || data.archivedAt)) {
    throw new Error("This Linear user is no longer available.");
  }
  return { text: JSON.stringify(data, null, 2), mimeType: "application/json" };
}
