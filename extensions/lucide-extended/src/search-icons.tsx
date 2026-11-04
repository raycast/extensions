import {
  Action,
  ActionPanel,
  Cache,
  Clipboard,
  closeMainWindow,
  Color,
  getPreferenceValues,
  Grid,
  Icon,
  Keyboard,
  showHUD,
} from "@raycast/api";
import { showFailureToast, useFetch, useLocalStorage } from "@raycast/utils";
import { memo, useEffect, useMemo, useState } from "react";
import { CATALOGUE_URL, parseCatalogue, toItems, type IconItem } from "./catalogue";
import { search, type Style } from "./search";

const PAGE_SIZE = 96;
const DEFAULT_COLOR = "PrimaryText";
const COLOR_NAMES = Object.keys(Color) as (keyof typeof Color)[];

const svgCache = new Cache();

/** SVG text isn't in icons.json, so it's fetched when needed. URLs are pinned to a version, so it never goes stale. */
async function fetchSvg(url: string): Promise<string> {
  const cached = svgCache.get(url);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const svg = await response.text();
  svgCache.set(url, svg);
  return svg;
}

async function copySvg(item: IconItem) {
  try {
    await Clipboard.copy(await fetchSvg(item.url));
    await showHUD(`Copied ${item.slug}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not fetch the SVG" });
  }
}

async function pasteSvg(item: IconItem) {
  try {
    const svg = await fetchSvg(item.url);
    await closeMainWindow();
    await Clipboard.paste(svg);
  } catch (error) {
    await showFailureToast(error, { title: "Could not fetch the SVG" });
  }
}

function iconActions(item: IconItem) {
  const component = item.component;
  return [
    {
      id: "copy-name",
      element: <Action.CopyToClipboard key="copy-name" title="Copy Name" content={item.slug} />,
    },
    {
      id: "copy-svg",
      element: (
        <Action
          key="copy-svg"
          title="Copy SVG"
          icon={Icon.Clipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={() => copySvg(item)}
        />
      ),
    },
    {
      id: "paste-svg",
      element: (
        <Action
          key="paste-svg"
          title="Paste SVG"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          onAction={() => pasteSvg(item)}
        />
      ),
    },
    {
      id: "copy-component",
      element: (
        <Action.CopyToClipboard
          key="copy-component"
          title="Copy Component"
          content={`<${component} />`}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
      ),
    },
    {
      id: "copy-import",
      element: (
        <Action.CopyToClipboard
          key="copy-import"
          title="Copy Import"
          content={`import { ${component} } from 'lucide-extended-react'`}
          shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
        />
      ),
    },
    {
      id: "open-in-browser",
      element: <Action.OpenInBrowser key="open-in-browser" url={item.url} shortcut={Keyboard.Shortcut.Common.Open} />,
    },
  ];
}

const IconGridItems = memo(function IconGridItems({
  items,
  color,
  showStyle,
  primaryAction,
  onColorChange,
}: {
  items: IconItem[];
  color: Color.ColorLike;
  showStyle: boolean;
  primaryAction: string;
  onColorChange: (name: string) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <Grid.Item
          key={item.slug}
          id={item.slug}
          title={item.name}
          subtitle={showStyle ? (item.variant === "filled" ? "Filled" : "Duotone") : undefined}
          content={{
            value: { source: item.url, tintColor: color },
            tooltip: item.deprecated ? `${item.slug}, deprecated: ${item.deprecated}` : item.slug,
          }}
          actions={
            <ActionPanel>
              {iconActions(item)
                .sort((a, b) => Number(b.id === primaryAction) - Number(a.id === primaryAction))
                .map((action) => action.element)}
              <ActionPanel.Section>
                <ActionPanel.Submenu
                  title="Change Color…"
                  icon={Icon.Brush}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                >
                  {COLOR_NAMES.map((name) => (
                    <Action
                      key={name}
                      // PrimaryText -> Primary Text
                      title={name.replace(/([a-z])([A-Z])/g, "$1 $2")}
                      icon={{ source: Icon.Circle, tintColor: Color[name] }}
                      onAction={() => onColorChange(name)}
                    />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </>
  );
});

export default function Command() {
  const { primaryAction } = getPreferenceValues<Preferences.SearchIcons>();
  const {
    data: catalogue,
    isLoading,
    error,
    revalidate,
  } = useFetch(CATALOGUE_URL, {
    parseResponse: parseCatalogue,
    keepPreviousData: true,
    // A failed refresh keeps the cached catalogue. With no cache, the empty view below reports it.
    onError: () => undefined,
  });
  const { value: colorName, setValue: setColorName } = useLocalStorage<string>("color", DEFAULT_COLOR);
  const [style, setStyle] = useState<Style>("all");
  const [searchText, setSearchText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const items = useMemo(() => (catalogue ? toItems(catalogue) : []), [catalogue]);
  const results = useMemo(() => search(items, searchText, style), [items, searchText, style]);
  const page = useMemo(() => results.slice(0, visible), [results, visible]);

  useEffect(() => setVisible(PAGE_SIZE), [searchText, style]);

  const color = Color[(colorName ?? DEFAULT_COLOR) as keyof typeof Color] ?? Color.PrimaryText;

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      navigationTitle={selected ? `Search Icons – ${selected}` : "Search Icons"}
      searchBarPlaceholder="Search by name, tag or use case"
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelected}
      throttle
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: visible < results.length,
        onLoadMore: () => setVisible((count) => count + PAGE_SIZE),
      }}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Style" storeValue onChange={(value) => setStyle(value as Style)}>
          <Grid.Dropdown.Item title="All Styles" value="all" />
          <Grid.Dropdown.Item title="Filled" value="filled" />
          <Grid.Dropdown.Item title="Duotone" value="duotone" />
        </Grid.Dropdown>
      }
    >
      {!catalogue && error ? (
        <Grid.EmptyView
          icon={Icon.WifiDisabled}
          title="Could Not Load the Icons"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : catalogue && results.length === 0 ? (
        <Grid.EmptyView icon={Icon.MagnifyingGlass} title="No Icons Found" description="Try another name or tag." />
      ) : (
        <Grid.Section title="Results" subtitle={catalogue ? String(results.length) : undefined}>
          <IconGridItems
            items={page}
            color={color}
            showStyle={style === "all"}
            primaryAction={primaryAction}
            onColorChange={setColorName}
          />
        </Grid.Section>
      )}
    </Grid>
  );
}
