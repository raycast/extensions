import { Action, ActionPanel, List } from "@raycast/api";
import { Application } from "./@types/eagle";
import { useApplicationInfo } from "./utils/query";

function SimpleTableItem({ title, text }: { title: string; text: string }) {
  return (
    <List.Item
      title={title}
      accessories={[
        {
          text,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={text} />
        </ActionPanel>
      }
    />
  );
}

const infoEntries: [string, keyof Application][] = [
  ["Version", "version"],
  ["Build Version", "buildVersion"],
  ["Exec Path", "execPath"],
  ["Platform", "platform"],
];

export default function Info() {
  const { data, error } = useApplicationInfo();

  return (
    <List isLoading={!error && !data}>
      {data ? infoEntries.map(([title, key]) => <SimpleTableItem key={key} title={title} text={data[key]!} />) : null}
    </List>
  );
}
