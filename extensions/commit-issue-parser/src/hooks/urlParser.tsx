import { Cache } from "@raycast/api";
import { useState } from "react";
import { DEFAULT_ISSUE } from "../constant/defaultIssue";
import type { Issue } from "../models/issue";

type useUrlParserProps = {
  cache: Cache;
};

type UrlParserState = {
  issue: Issue;
  setEntry: (entry: string) => void;
};

export default function useUrlParser({ cache }: useUrlParserProps): UrlParserState {
  const [issue, setIssue] = useState<Issue>(() => {
    const cached = cache.get("issue");
    if (!cached) return DEFAULT_ISSUE;

    try {
      return JSON.parse(cached);
    } catch {
      return DEFAULT_ISSUE;
    }
  });

  const resetStates = (): void => {
    setIssue(DEFAULT_ISSUE);
    cache.remove("issue");
  };

  const extractIdFromUrl = (url: string): string | undefined => {
    if (/atlassian\.net\/browse\//.test(url)) {
      const match = url.match(/atlassian\.net\/browse\/([A-Z0-9]+-\d+)/);
      return match ? match[1] : undefined;
    }

    if (/github\.com\/[^/]+\/[^/]+\/issues\//.test(url)) {
      const match = url.match(/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/);
      return match ? `#${match[1]}` : undefined;
    }

    if (/gitlab\.com\/.+\/issues\/\d+/.test(url)) {
      const match = url.match(/gitlab\.com\/.+\/issues\/(\d+)/);
      return match ? `#${match[1]}` : undefined;
    }

    return undefined;
  };

  const updateIssueUrl = (entry: string): void => {
    if (!entry) return resetStates();

    const newIssue: Issue = { ...issue, entry };
    const [firstPart, secondPart, thirdPart] = entry.split(",").map((p) => p.trim());

    let description: string | undefined;
    let body: string | undefined;

    const spaceParts = firstPart.split(" ");
    const possibleUrl = spaceParts[0].split("?")[0];
    const possibleId = extractIdFromUrl(possibleUrl);

    if (spaceParts.length > 1) {
      description = spaceParts.slice(1).join(" ");
      body = secondPart ?? thirdPart;
    } else {
      description = secondPart;
      body = thirdPart;
    }

    newIssue.url = possibleUrl;
    newIssue.id = possibleId ?? undefined;
    newIssue.description = description ?? undefined;
    newIssue.body = body ?? undefined;

    setIssue(newIssue);
    cache.set("issue", JSON.stringify(newIssue));
  };

  return {
    issue,
    setEntry: updateIssueUrl,
  };
}
