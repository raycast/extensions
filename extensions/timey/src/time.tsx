import { ActionPanel, Action, List } from "@raycast/api";

export default function Command() {
  const now = new Date();
  const ms = now.getTime();
  const s = Math.round(ms / 1000);
  const times = [
    {
      label: "ISO",
      value: now.toISOString(),
    },
    {
      label: "Unix (ms)",
      value: ms.toString(),
    },
    {
      label: "Unix (s)",
      value: `${s}`,
    },
    {
      label: "Local",
      value: now.toLocaleString(),
    },
  ];
  return (
    <List navigationTitle="Timey">
      {times.map((t) => {
        return (
          <List.Item
            key={t.label}
            title={t.label}
            subtitle={t.value}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy" content={t.value} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
