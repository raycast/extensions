import { useState } from "react";
import { DEFAULT_ISSUE } from "../constant/issue";
import type { Issue } from "../models/issue";

type UrlParserState = {
  issue: Issue;
  setEntry: (entry: string) => void;
};

export default function useUrlParser(): UrlParserState {
  const [issue, setIssue] = useState<Issue>(DEFAULT_ISSUE);

  const resetStates = (): void => setIssue(DEFAULT_ISSUE);

  const extractIdFromUrl = (url: string): string | undefined => {
    if (/atlassian\.net\/browse\//.test(url)) {
      const match = url.match(/atlassian\.net\/browse\/([A-Z]+-\d+)/);
      return match ? match[1] : undefined;
    }
    if (/github\.com\/[^/]+\/[^/]+\/issues\//.test(url)) {
      const match = url.match(/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/);
      return match ? `#${match[1]}` : undefined;
    }
    return undefined;
  };

  const updateIssueUrl = (entry: string): void => {
    if (entry === "") return resetStates();
    const newIssue: Issue = {
      ...issue,
      entry,
    };
    setIssue(newIssue);

    const parts = entry.split(",").map((part) => part.trim());
    if (parts.length < 1) {
      newIssue.url = extractIdFromUrl(parts[0]);
      setIssue(newIssue);
      return;
    }

    const [firstPart, commitType, description, body] = parts;

    newIssue.url = firstPart;
    newIssue.id = extractIdFromUrl(newIssue.url);
    newIssue.type = commitType ? commitType.trim() : undefined;
    newIssue.description = description ? description : undefined;
    newIssue.body = body ? body : undefined;

    setIssue(newIssue);
  };

  return {
    issue,
    setEntry: updateIssueUrl,
  };
}
