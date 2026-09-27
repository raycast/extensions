import { ActionPanel, Detail } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { RefreshAction } from "./Actions";

export function ModChangelog({ id, name }: { id: string; name: string }) {
  const {
    isLoading,
    data: markdown,
    error,
    revalidate,
  } = useFetch(
    `https://raw.githubusercontent.com/ramensoftware/windhawk-mods/refs/heads/pages/changelogs/${encodeURIComponent(id)}.md`,
  );

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Could not fetch changelog for ${id}` });
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${name} — Changelog`}
      markdown={isLoading ? `## _Loading…_` : `# ${name} Changelog\n\n${markdown}`}
      actions={
        <ActionPanel>
          <RefreshAction revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}
