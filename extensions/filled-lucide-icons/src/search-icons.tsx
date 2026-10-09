import { Action, ActionPanel, Color, getPreferenceValues, Grid, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ReactElement, useMemo, useState } from "react";
import { FilledIcon, imageUrl, loadIconLibrary, pageUrl, searchIcons, toComponent, toImport, toSvg } from "./icons";

const ALL = "all";
const ICONS_ONLY = "set:icons";
const LAB_ONLY = "set:lab";

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(loadIconLibrary, [], { keepPreviousData: true });
  const [filter, setFilter] = useState(ALL);
  const [searchText, setSearchText] = useState("");

  const icons = data?.icons ?? [];
  const categories = data?.categories ?? {};

  const visible = useMemo(() => {
    let filtered = icons;
    if (filter === ICONS_ONLY) filtered = icons.filter((icon) => icon.set === "icons");
    if (filter === LAB_ONLY) filtered = icons.filter((icon) => icon.set === "lab");
    if (filter.startsWith("category:")) {
      const category = filter.slice("category:".length);
      filtered = icons.filter((icon) => icon.categories.includes(category));
    }
    return searchIcons(filtered, searchText);
  }, [icons, filter, searchText]);

  const main = visible.filter((icon) => icon.set === "icons");
  const lab = visible.filter((icon) => icon.set === "lab");

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search icons by name or tag"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter Icons" storeValue onChange={setFilter}>
          <Grid.Dropdown.Item title="All Icons" value={ALL} icon={Icon.AppWindowGrid3x3} />
          <Grid.Dropdown.Item title="Lucide Icons" value={ICONS_ONLY} icon={Icon.Star} />
          <Grid.Dropdown.Item title="Lab Icons" value={LAB_ONLY} icon={Icon.Bolt} />
          <Grid.Dropdown.Section title="Categories">
            {Object.entries(categories).map(([slug, title]) => (
              <Grid.Dropdown.Item key={slug} title={title} value={`category:${slug}`} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {error && !data ? (
        <Grid.EmptyView
          icon={Icon.WifiDisabled}
          title="Could Not Load Icons"
          description="Check your internet connection and try again."
        />
      ) : (
        !isLoading && <Grid.EmptyView icon={Icon.MagnifyingGlass} title="No Icons Found" />
      )}
      <Grid.Section title="Icons" subtitle={main.length ? main.length.toLocaleString("en-US") : undefined}>
        {main.map((icon) => (
          <IconItem key={`icons/${icon.name}`} icon={icon} />
        ))}
      </Grid.Section>
      <Grid.Section title="Lab" subtitle={lab.length ? lab.length.toLocaleString("en-US") : undefined}>
        {lab.map((icon) => (
          <IconItem key={`lab/${icon.name}`} icon={icon} />
        ))}
      </Grid.Section>
    </Grid>
  );
}

function IconItem({ icon }: { icon: FilledIcon }) {
  return (
    <Grid.Item
      title={icon.name}
      content={{ source: imageUrl(icon), tintColor: Color.PrimaryText }}
      actions={<IconActions icon={icon} />}
    />
  );
}

function IconActions({ icon }: { icon: FilledIcon }) {
  const { primaryAction, framework } = getPreferenceValues<Preferences.SearchIcons>();
  const svg = toSvg(icon);

  const actions: [string, ReactElement][] = [
    [
      "copy-svg",
      <Action.CopyToClipboard key="copy-svg" title="Copy SVG" content={svg} shortcut={Keyboard.Shortcut.Common.Copy} />,
    ],
    [
      "paste-svg",
      <Action.Paste
        key="paste-svg"
        title="Paste SVG"
        content={svg}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "v" },
          Windows: { modifiers: ["ctrl", "shift"], key: "v" },
        }}
      />,
    ],
    [
      "copy-name",
      <Action.CopyToClipboard
        key="copy-name"
        title="Copy Name"
        content={icon.name}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />,
    ],
    [
      "copy-component",
      <Action.CopyToClipboard
        key="copy-component"
        title="Copy Component"
        icon={Icon.Code}
        content={toComponent(icon)}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "r" },
          Windows: { modifiers: ["ctrl", "shift"], key: "r" },
        }}
      />,
    ],
    [
      "copy-import",
      <Action.CopyToClipboard
        key="copy-import"
        title="Copy Import"
        icon={Icon.Download}
        content={toImport(icon, framework)}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "i" },
          Windows: { modifiers: ["ctrl", "shift"], key: "i" },
        }}
      />,
    ],
    [
      "open-in-browser",
      <Action.OpenInBrowser key="open-in-browser" url={pageUrl(icon)} shortcut={Keyboard.Shortcut.Common.Open} />,
    ],
  ];
  actions.sort(([a], [b]) => Number(b === primaryAction) - Number(a === primaryAction));

  return (
    <ActionPanel title={icon.name}>
      <ActionPanel.Section>{actions.map(([, action]) => action)}</ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy SVG URL"
          icon={Icon.Link}
          content={imageUrl(icon)}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
