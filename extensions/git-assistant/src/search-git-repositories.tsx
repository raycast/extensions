import { ActionPanel, Action, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { exec } from "child_process";
import os from "node:os";
import spotlight from "node-spotlight";
import path from "path";

type SearchResult = {
  name: string;
  path: string;
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const abortable = useRef<AbortController>();

  const maxResults = 250;

  // Get git root directory if it exists
  const getGitRoot = async (path: string): Promise<string | null> => {
    console.log("Checking git root for path:", path);
    return new Promise((resolve) => {
      exec("git rev-parse --show-toplevel", { cwd: path }, (error, stdout) => {
        if (error) {
          console.log("Not a git repository:", path);
          resolve(null);
          return;
        }
        const root = stdout.trim();
        console.log("Found git root:", root, "for path:", path);
        resolve(root);
      });
    });
  };

  const { isLoading } = usePromise(
    async (searchPattern: string) => {
      try {
        if (searchPattern === "") {
          console.log("Empty search text, clearing results");
          setResults([]);
          return [];
        }

        // Search for folders matching the name
        console.log("Starting spotlight search with pattern:", searchPattern);

        const allResults = await spotlight(`"${searchPattern}" kind:folder`);
        console.log("Spotlight search returned results");

        setResults([]);
        let resultsCount = 0;
        const seenRoots = new Set<string>();

        for await (const result of allResults) {
          // Skip if we've already checked this path or its parent
          if ([...seenRoots].some((root) => result.path.startsWith(root))) {
            console.log("Skipping already seen path:", result.path);
            continue;
          }

          console.log("Checking path:", result.path);
          const gitRoot = await getGitRoot(result.path);

          if (gitRoot && !seenRoots.has(gitRoot)) {
            const repoName = path.basename(gitRoot).toLowerCase();
            console.log("Found git repository:", repoName, "at:", gitRoot);

            // Only add if the repository name contains the search text
            if (repoName.includes(searchPattern.toLowerCase())) {
              console.log("Repository name matches search pattern, adding to results");
              seenRoots.add(gitRoot);
              setResults((state) => [
                ...state,
                {
                  name: path.basename(gitRoot),
                  path: gitRoot,
                },
              ]);

              resultsCount++;
              console.log("Current results count:", resultsCount);

              if (resultsCount >= maxResults) {
                console.log("Reached max results limit:", maxResults);
                abortable?.current?.abort();
                break;
              }
            } else {
              console.log("Repository name does not match search pattern:", repoName);
            }
          }
        }

        console.log("Search complete. Total results:", resultsCount);
        return [];
      } catch (error) {
        console.error("Search error:", error);
        return [];
      }
    },
    [searchText.toLowerCase()],
    { abortable },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search git repositories by name..."
      throttle={true}
      onSearchTextChange={setSearchText}
    >
      {searchText && <List.EmptyView title="No git repositories found" description="Try refining your search" />}
      {!searchText && (
        <List.EmptyView title="Search for git repositories" description="Search git repositories by folder name" />
      )}
      <List.Section title="Git Repositories">
        {results.map((searchResult) => (
          <SearchListItem key={searchResult.path} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem(props: { searchResult: SearchResult }) {
  const { searchResult } = props;

  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.path.replace(os.homedir(), "~")}
      key={searchResult.path}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenWith path={searchResult.path} />
            <Action.ShowInFinder path={searchResult.path} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={searchResult.path}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
