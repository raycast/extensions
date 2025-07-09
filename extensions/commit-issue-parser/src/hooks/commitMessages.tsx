import { COMMIT_TYPES } from "../constant/commitType";
import { CommitMessage } from "../models/commitMessage";
import { ContentFormat } from "../models/contentFormat";
import { Issue } from "../models/issue";
import { Preferences } from "../models/preferences";
import { TypeMode } from "../models/typeMode";

type CommitMessageProps = {
  preferences: Preferences;
  issue: Issue;
};

type CommitMessageState = {
  commitMessages: CommitMessage[];
};

export default function useCommitMessages({ preferences, issue }: CommitMessageProps): CommitMessageState {
  const getMessage = (type: (typeof COMMIT_TYPES)[number]): string => {
    const scope = issue.id ?? issue.url ?? issue.entry;
    const description = issue.description ?? "";
    if (!(issue.id || issue.url)) {
      return preferences.typeMode === TypeMode.TEXT ? `${type.label}: ${description}` : `${type.emoji} ${description}`;
    }
    return preferences.typeMode === TypeMode.TEXT
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
      contentFormat === ContentFormat.LAZYGIT
        ? `${message}${body ? `\n${body}` : ""}`
        : contentFormat === ContentFormat.GIT
          ? `git commit -m "${message}"${body ? ` -m "${body}"` : ""}`
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
