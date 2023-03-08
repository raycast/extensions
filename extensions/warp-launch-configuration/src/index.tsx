import { ActionPanel, Action, List, closeMainWindow } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runJxa } from "run-jxa";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const fullPath = path.join(os.homedir(), ".warp/launch_configurations");

    fs.readdir(fullPath, (error, files) => {
      if (error) {
        console.log(error);
      }

      setResults(files.map((file) => ({ name: file.replace(".yaml", ""), path: path.join(fullPath, file) })));
    });
  }, []);

  return (
    <List
      isLoading={results.length === 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Searching for launch configurations..."
      throttle
    >
      <List.Section title="Results" subtitle={results?.length + ""}>
        {results
          ?.filter((f) => f.name.includes(searchText.toLowerCase()))
          .map((searchResult) => (
            <SearchListItem key={searchResult.name} searchResult={searchResult} />
          ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const appleScript = `const se = Application('System Events');
    Application('Warp').activate();
    se.keystroke('l', { using: ['command down', 'control down'] });
    se.keystroke('${searchResult.name}');
    se.keyCode(36);`;

  return (
    <List.Item
      title={searchResult.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Launch"
              onAction={() => {
                runJxa(appleScript);
                closeMainWindow();
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder
              title="Reveal in Finder"
              path={searchResult.path}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.Open
              title="Edit Launch Configuration"
              target={searchResult.path}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface SearchResult {
  name: string;
  path: string;
}
