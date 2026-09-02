import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { runAppleScript, usePromise } from "@raycast/utils";
import { useState } from "react";
import { Browser } from "./components/browser";
import { isDirectory } from "./lib/read-dir";

/** AppleScript for the front Finder window's folder path. */
const FRONT_WINDOW_PATH = `
tell application "Finder"
  if (count of windows) is 0 then return ""
  return POSIX path of (target of front window as alias)
end tell
`;

/** Searches the front Finder folder or reports why it cannot be read. */
export default function Command() {
  const [searchEverywhere, setSearchEverywhere] = useState(false);

  const { data, isLoading } = usePromise(async () => {
    try {
      const out = (await runAppleScript(FRONT_WINDOW_PATH)).trim();
      if (out !== "" && isDirectory(out)) return { dir: out };
      return { reason: "No Finder window is open." };
    } catch {
      return {
        reason:
          "Raycast could not talk to Finder. Allow it under System Settings › Privacy & Security › Automation.",
      };
    }
  });

  if (isLoading || data === undefined) {
    return (
      <List
        isLoading
        searchBarPlaceholder="Asking Finder which folder is in front…"
      />
    );
  }

  if (searchEverywhere) return <Browser />;

  if (!("dir" in data)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Finder}
          title="Nothing to scope the search to"
          description={data.reason}
          actions={
            <ActionPanel>
              <Action
                title="Search Everywhere Instead"
                icon={Icon.MagnifyingGlass}
                onAction={() => setSearchEverywhere(true)}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <Browser dir={data.dir} />;
}
