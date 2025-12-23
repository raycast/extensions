import { ActionPanel, Action, Detail, LaunchProps } from "@raycast/api";

export default function Command(props: LaunchProps<{ arguments: { year: string; month: string; day: string } }>) {
  const { year, month, day } = props.arguments;

  const date = new Date(`${year}-${month}-${day}`);
  const timestamp = date.getTime();

  return (
    <Detail
      markdown={`# Timestamp: ${timestamp}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Timestamp" content={timestamp} />
        </ActionPanel>
      }
    />
  );
}
