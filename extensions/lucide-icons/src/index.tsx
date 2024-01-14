import { Action, ActionPanel, Color, Grid, Icon } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import fetch from "node-fetch";

// Lucide's toPascalCase function
export const toPascalCase = (string: string) => {
  const camelCase = string.replace(/^([A-Z])|[\s-_]+(\w)/g, (_match, p1, p2) =>
    p2 ? p2.toUpperCase() : p1.toLowerCase()
  );

  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

type LucideIcon = {
  name: string;
  content: string;
  path: string;
  component: string;
};

export default function Command() {
  const { data, isLoading } = useCachedPromise(
    async (iconNodesUrl: string) => {
      const response = await fetch(iconNodesUrl)
        .then((res) => res.json() as Promise<Record<string, unknown>>)
        .then((data) => Object.keys(data));

      const promises = response.map(async (iconName) => {
        const url = `https://lucide.dev/api/icons/${iconName}`;
        const content = await fetch(url).then((res) => res.text());

        return {
          name: iconName,
          content,
          path: url,
          component: `<${toPascalCase(iconName)} />`,
        };
      });

      const icons = await Promise.all(promises);
      setIcons(icons);
    },
    ["https://lucide.dev/api/icon-nodes"],
    {
      keepPreviousData: true,
    }
  );

  const [icons, setIcons] = useCachedState<LucideIcon[] | null>("icons", null);

  console.log(data);
  // const files = useMemo(
  //   () =>
  //     readdirSync(join(environment.assetsPath, "icons"))
  //       .filter((file) => file.endsWith(".svg"))
  //       .map((file) => {
  //         return [join(environment.assetsPath, "icons", file), file.split(".")[0]];
  //       }),
  //   []
  // );

  const [color, setColor] = useCachedState<Color>("color", Color.PrimaryText);
  const [columns, setColumns] = useCachedState<number>("size", 8);

  return (
    <Grid columns={columns} inset={Grid.Inset.Large} isLoading={isLoading || !data}>
      {icons?.map((icon) => (
        <Grid.Item
          key={icon.name}
          content={{ source: icon.path, tintColor: color }}
          title={icon.name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://lucide.dev/icon/${icon.name}`} />
              <Action.CopyToClipboard content={icon.name} title="Copy Name to Clipboard" />
              <Action.CopyToClipboard content={icon.content} title="Copy SVG to Clipboard" />
              <Action.CopyToClipboard content={`<${toPascalCase(icon.name)} />`} title="Copy Component to Clipboard" />
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
