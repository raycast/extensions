import { Action, ActionPanel, Detail } from "@raycast/api";

export function ErrorView({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <Detail
      markdown={`## Error\n\n${message}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Install Aerospace"
            url="https://nikitabobko.github.io/AeroSpace/guide#installation"
          />
        </ActionPanel>
      }
    />
  );
}
