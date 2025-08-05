import { COMMIT_TYPES } from "../constant/commitType";
import { CommitMessage } from "../models/commitMessage";
import { CommitType } from "../models/commitType";
import { Issue } from "../models/issue";

type CommitMessageProps = {
  preferences: Preferences;
  issue: Issue;
};

type CommitMessageState = {
  commitMessages: CommitMessage[];
};

export default function useCommitMessages({ preferences, issue }: CommitMessageProps): CommitMessageState {
  const getMessage = (type: CommitType): string => {
    const scope = issue.id ?? issue.url;
    const description = issue.description ?? "";
    if (!scope) {
      return preferences.typeMode === "text" ? `${type.label}: ${description}` : `${type.emoji} ${description}`;
    }
    return preferences.typeMode === "text"
      ? `${type.label}(${scope}): ${description}`
      : `${type.emoji} ${scope} ${description}`;
  };

  const getBody = (): string | undefined => {
    const issueDetails = issue.url;
    if (!issueDetails || (!issue.id && !issue.body)) return;

    const issueType = issue.id ? "url" : "scope";
    const bodyContent = issue.body ? `\n\n${issue.body}` : "";
    return `Issue ${issueType}: ${issueDetails}${bodyContent}`;
  };

  const commitMessages = COMMIT_TYPES.map((type): CommitMessage => {
    const message = getMessage(type);
    const body = getBody();

    const contentFormat = preferences.contentFormat;
    const contentAction =
      contentFormat === "lazygit"
        ? `${message}${body ? `\n${body}` : ""}`
        : contentFormat === "git"
          ? `git commit -m ${JSON.stringify(message)}${body ? ` -m ${JSON.stringify(body)}` : ""}`
          : message;

    return {
      ...type,
      message,
      body,
      contentAction,
    };
  });

  return { commitMessages };
}
