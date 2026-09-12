import { Color, Icon } from "@raycast/api";
import { SessionDetail, SessionStatus, SessionSummary } from "../types";

export function sessionStatusIcon(status: SessionStatus): {
  source: Icon;
  tintColor: Color;
} {
  switch (status) {
    case "working":
    case "resumed":
    case "resume_requested":
    case "resume_requested_frontend":
      return { source: Icon.Dot, tintColor: Color.Blue };
    case "finished":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "blocked":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "expired":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "suspend_requested":
    case "suspend_requested_frontend":
      return { source: Icon.MinusCircle, tintColor: Color.Yellow };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function sortSessions(sessions: SessionSummary[], favoriteIds: string[], recentIds: string[]): SessionSummary[] {
  const favoriteRank = new Map(favoriteIds.map((id, index) => [id, index]));
  const recentRank = new Map(recentIds.map((id, index) => [id, index]));

  return [...sessions].sort((left, right) => {
    const leftFavorite = favoriteRank.has(left.id);
    const rightFavorite = favoriteRank.has(right.id);

    if (leftFavorite !== rightFavorite) {
      return leftFavorite ? -1 : 1;
    }

    if (leftFavorite && rightFavorite) {
      return favoriteRank.get(left.id)! - favoriteRank.get(right.id)!;
    }

    const leftRecent = recentRank.has(left.id);
    const rightRecent = recentRank.has(right.id);

    if (leftRecent !== rightRecent) {
      return leftRecent ? -1 : 1;
    }

    if (leftRecent && rightRecent) {
      return recentRank.get(left.id)! - recentRank.get(right.id)!;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function filterSessions(sessions: SessionSummary[], searchText: string): SessionSummary[] {
  const query = searchText.trim().toLowerCase();
  if (!query) {
    return sessions;
  }

  return sessions.filter((session) => {
    const haystack = [
      session.id,
      session.title,
      session.statusLabel,
      session.requestingUserEmail,
      session.playbookId,
      session.snapshotId,
      ...session.tags,
    ]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function renderStructuredOutput(structuredOutput: unknown): string {
  if (!hasStructuredOutput(structuredOutput)) {
    return "";
  }

  try {
    return `\`\`\`json\n${JSON.stringify(structuredOutput, null, 2)}\n\`\`\``;
  } catch {
    return "_Unavailable_";
  }
}

export function buildSessionMarkdown(session: SessionSummary, detail?: SessionDetail): string {
  const structuredOutput = detail?.structuredOutput ?? session.structuredOutput;
  const tags = session.tags.length ? session.tags.map((tag) => `\`${tag}\``).join(" ") : "_None_";
  const messages = detail?.messages.length
    ? detail.messages
        .slice(-5)
        .map((message) => {
          const author = formatMessageAuthor(message.author);
          const timestamp = message.createdAt ? ` · ${new Date(message.createdAt).toLocaleString("en-US")}` : "";

          return `**${author}**${timestamp}\n\n${message.body}`;
        })
        .join("\n\n---\n\n")
    : "_No messages returned by the API._";
  const metadataLines = [
    `**Status**  \n${session.statusLabel}`,
    `**Updated**  \n${new Date(session.updatedAt).toLocaleString("en-US")}`,
    `**Created**  \n${new Date(session.createdAt).toLocaleString("en-US")}`,
    `**Session ID**  \n\`${session.id}\``,
    `**Tags**  \n${tags}`,
    session.requestingUserEmail ? `**Creator**  \n${session.requestingUserEmail}` : undefined,
    session.pullRequestUrl ? `**Pull Request**  \n${session.pullRequestUrl}` : undefined,
  ].filter(Boolean);

  return [
    `# ${escapeMarkdown(session.title)}`,
    "",
    metadataLines.join("\n\n"),
    hasStructuredOutput(structuredOutput) ? "" : undefined,
    hasStructuredOutput(structuredOutput) ? "## Structured Output" : undefined,
    hasStructuredOutput(structuredOutput) ? "" : undefined,
    hasStructuredOutput(structuredOutput) ? renderStructuredOutput(structuredOutput) : undefined,
    "",
    "## Recent Messages",
    "",
    messages,
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
}

function hasStructuredOutput(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return true;
}

function formatMessageAuthor(author?: string): string {
  if (!author) {
    return "Message";
  }

  if (author.includes("@")) {
    return "You";
  }

  return author;
}
