import { ActionPanel, Action, Color, Grid, showHUD, Icon as RcIcon } from "@raycast/api";
import { useCachedState, useFetch, useFrecencySorting } from "@raycast/utils";
import { memo } from "react";
import fetch from "node-fetch";
import { Clipboard } from "@raycast/api";
import { Icon, IconAsset, MaterialIconStyle } from "./types";
import DownloadForm from "./download-form";

export default function GridView() {
  const [materialIconStyle, setMaterialIconStyle] = useCachedState<MaterialIconStyle>(
    "materialIconStyle",
    MaterialIconStyle.Filled
  );

  const { isLoading: isLoading, data: icons } = useFetch<Icon[], Icon[]>("https://fonts.google.com/metadata/icons", {
    initialData: [],
    parseResponse: parseIcons,
    keepPreviousData: true,
  });

  const { data: sortedIcons, visitItem } = useFrecencySorting(icons, { key: (item) => item.codepoint });

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search icons..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Material Icon Style"
          onChange={(newValue) => {
            setMaterialIconStyle(+newValue);
          }}
          value={materialIconStyle.toString()}
        >
          <Grid.Dropdown.Section title="Material Icon Style">
            {Object.entries(MaterialIconStyle)
              .filter(([key]) => isNaN(+key))
              .map(([key, value]) => (
                <Grid.Dropdown.Item key={key} title={key} value={value.toString()} />
              ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      throttle
    >
      <Grid.Section title="Results" subtitle={icons.length > 0 ? `Found ${icons.length} icons` : undefined}>
        {sortedIcons.map((icon) => {
          return <SearchGridItem key={icon.name} icon={icon} visitItem={visitItem} />;
        })}
      </Grid.Section>
    </Grid>
  );
}

const SearchGridItem: React.VFC<{
  icon: Icon;
  visitItem: (item: Icon) => Promise<void>;
}> = memo(({ icon, visitItem }) => {
  const [materialIconStyle, setMaterialIconStyle] = useCachedState<MaterialIconStyle>(
    "materialIconStyle",
    MaterialIconStyle.Filled
  );

  return (
    <Grid.Item
      key={icon.codepoint}
      title={icon.name}
      subtitle={icon.codepoint}
      keywords={icon.tags}
      content={{ source: icon.assets[materialIconStyle].url, tintColor: { light: "black", dark: "white" } }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy to Clipboard">
            <Action.CopyToClipboard
              title="Copy Name"
              content={icon.name}
              onCopy={() => visitItem(icon)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Codepoint"
              content={icon.codepoint}
              onCopy={() => visitItem(icon)}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <Action
              title="Copy SVG"
              icon={RcIcon.CopyClipboard}
              onAction={async () => {
                await fetchSvg(icon, materialIconStyle);
                await showHUD("SVG copied to clipboard");
                visitItem(icon);
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Download">
            <Action.Push
              icon={RcIcon.Download}
              target={<DownloadForm icon={icon} />}
              title="Download"
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Preferences">
            <ActionPanel.Submenu title="Set Icon Style" icon={RcIcon.Brush}>
              <Action
                icon={{ source: RcIcon.Brush }}
                title="Filled"
                onAction={() => setMaterialIconStyle(MaterialIconStyle.Filled)}
              />
              <Action
                icon={{ source: RcIcon.Brush }}
                title="Outlined"
                onAction={() => setMaterialIconStyle(MaterialIconStyle.Outlined)}
              />
              <Action
                icon={{ source: RcIcon.Brush }}
                title="Rounded"
                onAction={() => setMaterialIconStyle(MaterialIconStyle.Rounded)}
              />
              <Action
                icon={{ source: RcIcon.Brush }}
                title="Sharp"
                onAction={() => setMaterialIconStyle(MaterialIconStyle.Sharp)}
              />
              <Action
                icon={{ source: RcIcon.Brush }}
                title="Two Tone"
                onAction={() => setMaterialIconStyle(MaterialIconStyle["Two Tone"])}
              />
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
});

async function parseIcons(response: Response) {
  type Response = {
    host: string;
    asset_url_pattern: string;
    families: string[];
    icons: {
      categories: string[];
      codepoint: number;
      name: string;
      sizes_px: number[];
      tags: string[];
      version: number;
    }[];
  };

  const body = await response.text();

  const json = JSON.parse(body.replace(/^.+?\n/, "")) as Response;

  const icons = json.icons.map<Icon>((icon) => {
    const assets: IconAsset[] = json.families.map((family) => {
      const path = json.asset_url_pattern
        .replace("{family}", family.toLowerCase().replace(/\W+/g, ""))
        .replace("{icon}", icon.name)
        .replace("{version}", String(icon.version))
        .replace("{asset}", `${icon.sizes_px[0] ?? 24}px`);
      const url = `https://${json.host}/${path}.svg`;

      return { family, url };
    });

    return {
      categories: icon.categories.join(", "),
      codepoint: icon.codepoint.toString(16),
      name: icon.name,
      tags: icon.tags,
      version: icon.version,
      assets,
    };
  });

  return icons;
}

async function fetchSvg(icon: Icon, style: MaterialIconStyle) {
  const res = await fetch(icon.assets[style].url);
  const txt = await res.text();

  Clipboard.copy(txt);
}
