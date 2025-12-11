import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import React from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface SearchResult {
  path: string;
  name: string;
  directory: string;
  type: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toEastern = (text: string) => {
    return text.replace(/[0-9]/g, (digit) => {
      const map: { [key: string]: string } = {
        "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤",
        "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩"
      };
      return map[digit];
    });
  };

  const toWestern = (text: string) => {
    return text.replace(/[٠-٩]/g, (digit) => {
      const map: { [key: string]: string } = {
        "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
        "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"
      };
      return map[digit];
    });
  };

  useEffect(() => {
    async function search() {
      if (searchText.trim().length === 0) {
        setResults([]);
        return;
      }

      setIsLoading(true);

      try {
        const westernQuery = toWestern(searchText);
        const easternQuery = toEastern(searchText);

        const commands = [
          `mdfind "${westernQuery}" 2>/dev/null`,
          `mdfind "${easternQuery}" 2>/dev/null`
        ];

        const promises = commands.map(cmd => execAsync(cmd));
        const responses = await Promise.all(promises);

        const allPaths = responses
          .map(r => r.stdout.trim())
          .filter(Boolean)
          .flatMap(output => output.split("\n"))
          .filter(Boolean);

        const uniquePaths = Array.from(new Set(allPaths));

        const formattedResults: SearchResult[] = uniquePaths.map(path => {
          const parts = path.split("/");
          const name = parts[parts.length - 1];
          const directory = parts.slice(0, -1).join("/");
          const type = path.includes(".") ? "file" : "folder";

          return { path, name, directory, type };
        });

        setResults(formattedResults);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: String(error)
        });
      } finally {
        setIsLoading(false);
      }
    }

    search();
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search with both Eastern & Western numerals..."
      throttle
    >
      {results.length === 0 && !isLoading && searchText.length > 0 ? (
        <List.EmptyView
          title="No results found"
          description={`Searched for: ${toWestern(searchText)} and ${toEastern(searchText)}`}
        />
      ) : (
        results.map((result, index) => (
          <List.Item
            key={`${result.path}-${index}`}
            title={result.name}
            subtitle={result.directory}
            icon={result.type === "file" ? "📄" : "📁"}
            accessories={[{ text: result.type }]}
            actions={
              <ActionPanel>
                <Action.Open title="Open" target={result.path} />
                <Action.ShowInFinder path={result.path} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={result.path}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.OpenWith path={result.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
