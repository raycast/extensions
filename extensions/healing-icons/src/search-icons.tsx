import { Action, ActionPanel, Color, Grid, Icon, getPreferenceValues } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";

const BASE = "https://healing-icons.vercel.app";
const STYLES = ["outline", "outline-duo", "fill", "glyph-duo"];

type Row = [name: string, category: string, svg: string, tags: string[]];
type Preferences = { defaultAction: "copy-svg" | "paste-svg" | "copy-jsx" | "copy-name" };

/** "arrow-left" -> "ArrowLeftIcon"; names starting with a digit become "Icon2fa" (same as the packages). */
function componentName(name: string) {
  const pascal = name
    .split("-")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join("");
  return /^\d/.test(pascal) ? `Icon${pascal}` : `${pascal}Icon`;
}

/** Preview image: the icons use currentColor, which has no meaning in an image, so it gets a gray that reads on both themes. */
const preview = (svg: string) =>
  `data:image/svg+xml;base64,${Buffer.from(svg.replace(/currentColor/g, "#8a8a8a")).toString("base64")}`;

export default function SearchIcons() {
  const { defaultAction } = getPreferenceValues<Preferences>();
  const [style, setStyle] = useCachedState("style", "outline");
  const [query, setQuery] = useState("");

  // The data files are content-hashed; the manifest says which ones are current.
  const { data: manifest } = useFetch<Record<string, string>>(`${BASE}/data-manifest.json`, { keepPreviousData: true });
  const { data: rows = [], isLoading } = useFetch<Row[]>(manifest ? BASE + manifest[style] : "", {
    execute: !!manifest,
    keepPreviousData: true,
  });

  const icons = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const q = terms.join("-");
    return rows
      .filter(([name, category, , tags]) =>
        terms.every((t) => name.includes(t) || category.includes(t) || tags.some((tag) => tag.includes(t))),
      )
      .sort(
        ([a], [b]) =>
          Number(b === q) - Number(a === q) || Number(b.startsWith(q)) - Number(a.startsWith(q)) || a.localeCompare(b),
      )
      .slice(0, 600);
  }, [rows, query]);

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      isLoading={isLoading || !manifest}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search icons by name or tag"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Style" value={style} onChange={setStyle}>
          {STYLES.map((s) => (
            <Grid.Dropdown.Item key={s} title={s} value={s} />
          ))}
        </Grid.Dropdown>
      }
    >
      {icons.map(([name, category, svg, tags]) => {
        const component = componentName(name);
        const actions = {
          "copy-svg": <Action.CopyToClipboard key="copy-svg" title="Copy SVG" content={svg} />,
          "paste-svg": <Action.Paste key="paste-svg" title="Paste SVG" content={svg} />,
          "copy-jsx": <Action.CopyToClipboard key="copy-jsx" title="Copy React JSX" content={`<${component} />`} />,
          "copy-name": <Action.CopyToClipboard key="copy-name" title="Copy Name" content={name} />,
        };
        const rest = Object.entries(actions)
          .filter(([key]) => key !== defaultAction)
          .map(([, action]) => action);
        return (
          <Grid.Item
            key={name}
            content={{ source: preview(svg) }}
            title={name}
            keywords={tags}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {actions[defaultAction]}
                  {rest}
                </ActionPanel.Section>
                <ActionPanel.Section title="Code">
                  <Action.CopyToClipboard
                    title="Copy React Import"
                    icon={Icon.Code}
                    content={`import { ${component} } from "@healing-icons/react/${style}";`}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "r" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "r" },
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Vue Import"
                    icon={Icon.Code}
                    content={`import { ${component} } from "@healing-icons/vue/${style}";`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Svelte Import"
                    icon={Icon.Code}
                    content={`import ${component} from "@healing-icons/svelte/${style}/${component}";`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Web Component Tag"
                    icon={Icon.Code}
                    content={`<healing-icon name="${name}"${style === "outline" ? "" : ` variant="${style}"`}></healing-icon>`}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open on Website"
                    icon={{ source: Icon.Globe, tintColor: Color.Green }}
                    url={`${BASE}/icons/${name}`}
                  />
                  <Action.CopyToClipboard title={`Copy Category (${category})`} content={category} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
