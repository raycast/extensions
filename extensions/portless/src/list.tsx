import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { useMemo } from "react";
import { ActionPanel, Action, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { describePortlessError, parsePortlessListOutput } from "./portless";

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
  const preferences = getPreferenceValues<Preferences.List>();
  // The preference is a file picker, so a configured value is always an
  // absolute path to an existing file. Empty falls back to a PATH lookup.
  const executable = preferences.portlessExecutable?.trim() || "portless";
  const { data, isLoading, error, revalidate } = useExec(executable, ["list"], {
    env: { PATH: getExtendedPath() },
  });

  const urls = useMemo(() => parsePortlessListOutput(data ?? ""), [data]);

  // Raycast gives the first and second action in a panel the Enter and
  // Cmd+Enter shortcuts, so ordering the panel is all the swap requires.
  const openFirst = preferences.primaryAction === "open";

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to Run Portless"
          description={describePortlessError(error, executable)}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidate} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

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
            accessories={[
              openFirst ? { icon: Icon.Globe, text: "Open in Browser" } : { icon: Icon.Link, text: "Copy URL" },
            ]}
            actions={
              <ActionPanel>
                {openFirst
                  ? [
                      <Action.OpenInBrowser key="open" url={url} />,
                      <Action.CopyToClipboard key="copy" content={url} title="Copy URL" />,
                    ]
                  : [
                      <Action.CopyToClipboard key="copy" content={url} title="Copy URL" />,
                      <Action.OpenInBrowser key="open" url={url} />,
                    ]}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
