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
    const firstPart = parts[0].trim();
    const thirdPart = parts.length > 1 ? parts[parts.length - 1].trim() : undefined;
    const secondPart =
      parts.length > 2 ? parts.slice(1, -1).join(",").trim() : parts.length === 2 ? parts[1].trim() : undefined;

    let description: string | undefined;
    let body: string | undefined;

    const spaceParts = firstPart.split(" ");
    const possibleUrl = parseUrl(spaceParts[0]);
    const possibleId = extractIdFromUrl(possibleUrl);

    if (spaceParts.length > 1) {
      description = spaceParts.slice(1).join(" ").trimStart();
      if (parts.length > 2) {
        description += `,${parts
          .slice(1, parts.length - 1)
          .join(",")
          .trimEnd()}`;
        body = parts[parts.length - 1].trim();
      } else {
        body = secondPart ?? thirdPart;
      }
    } else {
      description = secondPart;
      body = thirdPart;
    }

    newIssue.url = possibleUrl;
    newIssue.id = possibleId ?? undefined;
    newIssue.description = description ?? undefined;
    newIssue.body = body ?? undefined;

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
