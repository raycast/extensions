import { Action, ActionPanel, Cache, Color, Grid, Icon } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import fetch from "node-fetch";

// Lucide's toPascalCase function
export const toPascalCase = (string: string) => {
  const camelCase = string.replace(/^([A-Z])|[\s-_]+(\w)/g, (_match, p1, p2) =>
    p2 ? p2.toUpperCase() : p1.toLowerCase(),
  );

  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

type LucideIcon = {
  name: string;
  content: string;
  path: string;
  component: string;
};

const DATA_STALE_TIME_IN_MILLISECONDS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Cache();

async function fetchIcons() {
  const cached = cache.get("icons");
  const lastFetchTime = Number(cache.get("lastFetchTime"));
  const currentTime = Date.now();

  // Check if data is cached and fetched less than 24 hours ago
  if (cached && lastFetchTime && currentTime - lastFetchTime < DATA_STALE_TIME_IN_MILLISECONDS) {
    return JSON.parse(cached) as LucideIcon[];
  }

  const response = await fetch("https://lucide.dev/api/icon-nodes")
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
  // Cache the icons and the current timestamp
  cache.set("icons", JSON.stringify(icons));
  cache.set("lastFetchTime", JSON.stringify(currentTime));
  return icons as LucideIcon[];
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(fetchIcons, [], {
    keepPreviousData: true,
  });

  const [color, setColor] = useCachedState<Color>("color", Color.PrimaryText);
  const [columns, setColumns] = useCachedState<number>("size", 8);

  return (
    <Grid columns={columns} inset={Grid.Inset.Large} isLoading={isLoading}>
      {data &&
        data.map((icon) => (
          <Grid.Item
            key={icon.name}
            content={{ source: icon.path, tintColor: color }}
            title={icon.name}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://lucide.dev/icon/${icon.name}`} />
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
