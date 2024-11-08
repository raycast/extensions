import { Action, ActionPanel, confirmAlert, Detail, Icon } from "@raycast/api";

import {
  get_version,
  fetch_github_latest_release,
  is_up_to_date,
  download_and_install_update,
} from "./helpers/update.jsx";
import { useEffect, useState } from "react";

export default function CheckForUpdates() {
  let version = get_version();
  let default_markdown = `## Current raycast-g4f version: ${version}`;
  let [markdown, setMarkdown] = useState(default_markdown);
  let fetched = false; // fix for the double rendering issue, similar to the one in useGPT

  useEffect(() => {
    (async () => {
      if (fetched) return;
      fetched = true;

      // get latest release from github
      const release = await fetch_github_latest_release();
      const latest_version = release.version;
      setMarkdown((prev) => `${prev}\n\n## Latest raycast-g4f version: ${latest_version}`);

      if (is_up_to_date(version, latest_version)) {
        setMarkdown((prev) => `${prev}\n\n## raycast-g4f is up to date!`);
      } else {
        setMarkdown((prev) => `${prev}\n\n## Update available!`);
        setMarkdown((prev) => `${prev}\n\n### Release Notes:\n\n${release.body}`);

        await confirmAlert({
          title: `Update available: version ${latest_version}`,
          message: "Would you like to update now?",
          icon: Icon.Download,
          primaryAction: {
            title: "Update",
            onAction: async () => {
              try {
                await download_and_install_update(setMarkdown);
              } catch (e) {
                setMarkdown(
                  (prev) =>
                    `${prev}\n\n# Update failed: ${e}\n## If the issue persists, please [open an issue on GitHub](https://github.com/XInTheDark/raycast-g4f/issues/new)!`
                );
              }
            },
          },
        });
      }
    })();
  }, []);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={"Install update"}
            icon={Icon.Download}
            onAction={async () => {
              await download_and_install_update(setMarkdown);
            }}
          ></Action>
        </ActionPanel>
      }
    ></Detail>
  );
}
