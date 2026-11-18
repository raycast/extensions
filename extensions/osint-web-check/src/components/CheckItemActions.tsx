import { Action, ActionPanel, Detail } from "@raycast/api";

interface CheckItemActionsProps {
  info: string;
  items?: [string, string][];
}

export function CheckItemActions({ info, items = [] }: CheckItemActionsProps) {
  return (
    <ActionPanel>
      <Action.Push title="More Info" target={<Detail markdown={info} />} />
      {items.map(([key, value]) => (
        <Action.CopyToClipboard key={key} title={`Copy ${key} to Clipboard`} content={value} />
      ))}
    </ActionPanel>
  );
}
