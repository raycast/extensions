import { Cache } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
    } catch (error) {
      showFailureToast(error, { title: "Failed to parse cache" });
      return DEFAULT_ISSUE;
    }
  });

  const resetStates = (): void => {
    setIssue(DEFAULT_ISSUE);
    try {
      cache.remove("issue");
    } catch (error) {
      showFailureToast(error, { title: "Failed to reset cache" });
    }
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

  const parseUrl = (urlEntry: string): string => {
    try {
      const url = new URL(urlEntry);

      // Github Projects URL handling
      const githubProjectMatch = urlEntry.match(
        /^https:\/\/github\.com\/orgs\/[^/]+\/projects\/\d+\/views\/\d+\?.*issue=([^&]+)/,
      );
      if (githubProjectMatch) {
        const issueParam = githubProjectMatch[1];
        const decodedIssue = decodeURIComponent(issueParam);
        const parts = decodedIssue.split("|");
        if (parts.length === 3) {
          const [org, repo, issueNumber] = parts;
          return `https://github.com/${org}/${repo}/issues/${issueNumber}`;
        }
      }

      // Jira URL handling
      const jiraMatch = urlEntry.match(
        /^(https?:\/\/[^/]+\.atlassian\.net)\/jira\/software\/projects\/[^/]+\/boards\/\d+\?.*selectedIssue=([^&]+)/,
      );
      if (jiraMatch) {
        const [, baseUrl, selectedIssue] = jiraMatch;
        return `${baseUrl}/browse/${selectedIssue}`;
      }

      // Filter out unnecessary params
      const paramsToKeep = ["focusedCommentId"];
      const filteredParams = new URLSearchParams();

      paramsToKeep.forEach((param) => {
        const value = url.searchParams.get(param);
        if (value) {
          filteredParams.set(param, value);
        }
      });

      return url.origin + url.pathname + (filteredParams.toString() ? "?" + filteredParams.toString() : "");
    } catch {
      // For invalid URLs, return the original entry
      return urlEntry;
    }
  };

  const updateIssueUrl = (entry: string): void => {
    if (!entry) return resetStates();

    const newIssue: Issue = { ...issue, entry };

    const parts = entry.split(",");
    const [firstPart, ...rest] = parts.map((p, i) => {
      if (i < 3) return p.trim();
      return p;
    });

    const spaceParts = firstPart.split(" ");
    const possibleUrl = parseUrl(spaceParts[0]);
    const possibleId = extractIdFromUrl(possibleUrl);

    let description: string | undefined;
    let body: string | undefined;

    if (spaceParts.length > 1) {
      description = spaceParts.slice(1).join(" ").trim();
      body = rest.length > 0 ? rest.join(",") : undefined;
    } else {
      description = rest[0] || undefined;
      body = rest.length > 1 ? rest.slice(1).join(",") : undefined;
    }

    newIssue.url = possibleUrl;
    newIssue.id = possibleId ?? undefined;
    newIssue.description = description || undefined;
    newIssue.body = body || undefined;

    setIssue(newIssue);
    try {
      cache.set("issue", JSON.stringify(newIssue));
    } catch (error) {
      showFailureToast(error, { title: "Failed to save to cache" });
    }
  };

  return {
    issue,
    setEntry: updateIssueUrl,
  };
}
