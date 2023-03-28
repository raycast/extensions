import { ActionPanel, Action, List, closeMainWindow, showToast, Toast, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runJxa } from "run-jxa";
import YAML from "yaml";
import { exec } from "node:child_process";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState(false);

  const showError = async (title: string, message: string) => {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });

    setError(true);
  };

  const init = async () => {
    const configPath = ".warp/launch_configurations";
    const fullPath = path.join(os.homedir(), configPath);

    const exists = await fs.stat(fullPath).catch(() => false);

    if (exists === false) {
      return showError("Launch configuration directory missing", `~/${configPath} wasn't found on your computer!`);
    }

    const files = await fs.readdir(fullPath).catch(() => null);

    if (files === null || typeof files === "undefined") {
      return showError(
        "Error reading launch configuration directory",
        "Something went wrong while reading the launch configuration directory."
      );
    }

    const fileList = await Promise.all(
      files
        .filter((file) => file.match(/.y(a)?ml$/g))
        .map(async (file) => {
          const contents = await fs.readFile(path.join(fullPath, file), "utf-8");

          const yaml = YAML.parse(contents);

          return { name: yaml.name, path: path.join(fullPath, file) };
        })
    );

    if (fileList.length === 0) {
      return showError(
        "No launch configurations found",
        "You need to create at least one launch configuration before launching: https://docs.warp.dev/features/sessions/launch-configurations"
      );
    }

    setResults(fileList);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <List
      isLoading={results.length === 0 && !error}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Searching for launch configurations..."
      throttle
    >
      <List.EmptyView
        title="No launch configurations found"
        description="You need to create at least one launch configuration before launching https://docs.warp.dev/features/sessions/launch-configurations."
      />
      <List.Section title="Results" subtitle={results?.length + ""}>
        {results
          ?.filter((f) => f.name.toLowerCase().includes(searchText.toLowerCase()))
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
              icon={Icon.Terminal}
              onAction={async () => {
                exec("open -a Warp.app", () => {
                  runJxa(appleScript);
                  closeMainWindow();
                });
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
