import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ChangelogVersion, fetchChangelog } from "../../utils/changelog";
import ChangelogDetail from "./detail";

export default function Changelog() {
  const [isLoading, setIsLoading] = useState(true);
  const [versions, setVersions] = useState<ChangelogVersion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChangelog() {
      try {
        setIsLoading(true);
        const data = await fetchChangelog();
        setVersions(data);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch changelog";
        setError(errorMessage);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load changelog",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadChangelog();
  }, []);

  if (error && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Changelog"
          description={error}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search changelog versions..."
    >
      {versions.map((version) => (
        <List.Item
          key={version.version}
          title={version.version}
          icon={Icon.Document}
          accessories={[
            {
              text: `${version.changes.length} ${version.changes.length === 1 ? "change" : "changes"}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Changes"
                target={<ChangelogDetail version={version} />}
                icon={Icon.Eye}
              />
              <Action.CopyToClipboard
                title="Copy to Clipboard"
                content={version.changes
                  .map((change) => `- ${change}`)
                  .join("\n")}
                icon={Icon.Clipboard}
              />
              <Action.OpenInBrowser
                title="View on GitHub"
                url="https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md"
                icon={Icon.Globe}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
