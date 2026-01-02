import { DEFAULT_BODY_FORMAT } from "../constant/bodyFormat";
import { DEFAULT_COMMIT_FORMAT } from "../constant/commitFormat";
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
  const getMessage = (commitType: CommitType): string => {
    const type = preferences.typeMode === "text" ? commitType.label : commitType.emoji;
    const scope = issue.id ?? issue.url ?? "";
    const description = issue.description ?? "";

    const commitFormat = preferences.commitFormat || DEFAULT_COMMIT_FORMAT;

    let message = commitFormat
      .replaceAll("{type}", type)
      .replaceAll("{scope}", scope)
      .replaceAll("{message}", description);

    if (!scope) {
      message = message.replace(/\\./g, "");
    } else {
      message = message.replaceAll("\\", "");
    }

    return message;
  };

  const getBody = (): string | undefined => {
    if (!issue.url && !issue.id && !issue.body) return;

    const bodyFormat = preferences.bodyFormat || DEFAULT_BODY_FORMAT;

    return bodyFormat
      .replaceAll("{scope}", issue.url || "unspecified")
      .replaceAll("{body}", issue.body || "")
      .replaceAll("\\n", "\n");
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
