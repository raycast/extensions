import { Action, ActionPanel, Grid, open } from "@raycast/api";
import { basename } from "path";

export function SpeedDialGrid({ items }: { items: (string | undefined)[] }) {
  const entries = items
    .filter((item): item is string => item !== undefined && item !== "")
    .map((path, index) => ({ index, path, name: basename(path) }));

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Small}
      aspectRatio="4/3"
      filtering={false}
      onSearchTextChange={(text) => {
        if (!/^\d+$/.test(text)) return;
        const num = Number.parseInt(text, 10);
        if (num >= 1 && num <= entries.length) {
          const entry = entries[num - 1];
          if (entry) open(entry.path);
        }
      }}
    >
      {entries.map((entry) => (
        <Grid.Item
          key={entry.index}
          title={`| ${entry.index + 1} | ${entry.name}`}
          content={{ fileIcon: entry.path }}
          actions={
            <ActionPanel>
              <Action.Open title={`Open ${entry.name}`} target={entry.path} />
              <Action.ShowInFinder title="Show in Finder" path={entry.path} />
              <Action.CopyToClipboard
                title="Copy Path"
                content={entry.path}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
