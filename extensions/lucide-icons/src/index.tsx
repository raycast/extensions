import { Action, ActionPanel, Color, Grid, Icon } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { toPascalCase } from "./utils";
import { fetchIcons } from "./fetch-icons";

export default function Command() {
  const { data, isLoading } = useCachedPromise(fetchIcons, [], {
    keepPreviousData: true,
  });

  const [color, setColor] = useCachedState<Color>("color", Color.PrimaryText);
  const [columns, setColumns] = useCachedState<number>("size", 8);

  return (
    <Grid columns={columns} inset={Grid.Inset.Large} isLoading={isLoading}>
      {data?.map((icon) => (
        <Grid.Item
          key={icon.name}
          content={{ source: icon.path, tintColor: color }}
          title={icon.name}
          keywords={icon.keywords}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={icon.path} />
              <Action.CopyToClipboard
                shortcut={{
                  modifiers: ["cmd"],
                  key: "n",
                }}
                content={icon.name}
                title="Copy Name to Clipboard"
              />
              <Action.CopyToClipboard
                shortcut={{
                  modifiers: ["cmd"],
                  key: "s",
                }}
                content={icon.content}
                title="Copy SVG to Clipboard"
              />
              <Action.CopyToClipboard
                shortcut={{
                  modifiers: ["cmd", "shift"],
                  key: "r",
                }}
                content={`<${toPascalCase(icon.name)} />`}
                title="Copy Component to Clipboard"
              />
              <ActionPanel.Section title="Preferences">
                <ActionPanel.Submenu title="Change Size…" icon={Icon.MagnifyingGlass}>
                  {[4, 6, 8].map((columns) => (
                    <Action key={columns} title={columns.toString()} onAction={() => setColumns(columns)} />
                  ))}
                </ActionPanel.Submenu>
                <ActionPanel.Submenu title="Change Color…" icon={Icon.EyeDropper}>
                  {Object.entries(Color).map(([key, color]) => (
                    <Action
                      key={color.toString()}
                      title={key}
                      icon={{ source: Icon.Circle, tintColor: color }}
                      onAction={() => setColor(color as Color)}
                    />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
