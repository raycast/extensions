import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, List, Icon } from "@raycast/api";
import { formatDistance } from "date-fns";
import { loadRecentReleases } from "../utils.js";
import { Release } from "../types.js";

export default function Releases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [error, setError] = useState("");

  const fetchReleases = async () => {
    try {
      const releases = await loadRecentReleases();
      setReleases(releases);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred while loading releases");
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const viewOnGitHub = (
    <ActionPanel>
      <Action.OpenInBrowser title="View on GitHub" url="https://github.com/simple-icons/simple-icons/releases" />
    </ActionPanel>
  );

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} description={error} actions={viewOnGitHub} />
      </List>
    );
  }

  if (releases.length === 0) {
    return <Detail isLoading={true} />;
  }

  const dateNow = new Date();

  const markdown = releases
    .map((release) =>
      [
        `## ${release.name.trim()}`,
        formatDistance(new Date(release.created_at), dateNow, { addSuffix: true }),
        release.body.trim().replace(/## /g, "### "),
        // "---",
      ].join("\n\n"),
    )
    .join("\n\n")
    .replace(/ \(#\d+\) \(@[^)]+\)/g, "");
  return <Detail markdown={markdown} actions={viewOnGitHub} />;
}
