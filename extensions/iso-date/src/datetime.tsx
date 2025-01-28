import { Action, ActionPanel, Detail } from "@raycast/api";

export default function DatetimeCommand() {
  const iso = new Date().toISOString();
  return (
    <Detail
      markdown={`# ${iso}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={iso} />
        </ActionPanel>
      }
    />
  );
}
