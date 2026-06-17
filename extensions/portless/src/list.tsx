import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useExec } from "@raycast/utils";

function parsePortlessListOutput(stdout: string): string[] {
  const urls: string[] = [];
  const lines = stdout.split("\n");
  for (const line of lines) {
    const match = line.match(/https?:\/\/[^\s]+/);
    if (match) {
      urls.push(match[0]);
    }
  }
  return urls;
}

// Extend PATH so portless is found when installed via nvm, homebrew, or ~/.local/bin.
// Raycast runs with a minimal PATH that often excludes nvm and homebrew.
function getExtendedPath(): string {
  const home = process.env.HOME || "";
  const extraPaths: string[] = [`${home}/.local/bin`, "/opt/homebrew/bin", "/usr/local/bin"];

  // Add nvm node paths (portless is often installed via npm in nvm-managed node)
  const nvmDir = join(home, ".nvm", "versions", "node");
  if (existsSync(nvmDir)) {
    try {
      const versions = readdirSync(nvmDir)
        .filter((v) => /^v\d+/.test(v))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/^v/, "").split(".")[0], 10);
          const numB = parseInt(b.replace(/^v/, "").split(".")[0], 10);
          return numB - numA;
        })
        .slice(0, 5);
      for (const ver of versions) {
        const nodeBin = join(nvmDir, ver, "bin");
        if (existsSync(nodeBin)) {
          extraPaths.push(nodeBin);
        }
      }
    } catch {
      // Ignore nvm resolution errors
    }
  }

  return [...extraPaths, process.env.PATH || "/usr/local/bin:/usr/bin:/bin"].join(":");
}

export default function Command() {
  const { data, isLoading } = useExec("portless", ["list"], {
    env: { PATH: getExtendedPath() },
    parseOutput: ({ stdout, error }) => (error ? [] : parsePortlessListOutput(stdout)),
  });

  const urls = data ?? [];

  return (
    <List searchBarPlaceholder="Search active routes..." isLoading={isLoading}>
      {urls.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Plug}
          title="No active routes"
          description="Start an app with: portless <name> <command>"
        />
      ) : (
        urls.map((url) => (
          <List.Item
            key={url}
            icon={Icon.Globe}
            title={url}
            subtitle="Portless route"
            accessories={[{ icon: Icon.Link, text: "Copy URL" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={url} title="Copy URL" />
                <Action.OpenInBrowser url={url} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
