import { useEffect, useState } from "react";
import { Action, ActionPanel, Cache, Clipboard, Detail, Grid, Icon, Toast, showHUD, showToast } from "@raycast/api";
import { titleToSlug } from "simple-icons/sdk";
import { Supports, CopySvg, OpenWith } from "./actions";
import { loadLatestVersion, loadJson, cleanSavedPaths, initSavePath } from "./utils";
import { IconJson, IconData } from "./types";

const itemDisplayColumns = {
  small: 8,
  medium: 5,
  large: 3,
} as const;

export default function Command() {
  const [itemSize, setItemSize] = useState<keyof typeof itemDisplayColumns>("small");
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState("latest");
  const [icons, setIcons] = useState<IconData[]>([]);

  const cache = new Cache();

  useEffect(() => {
    (async () => {
      await showToast({
        style: Toast.Style.Animated,
        title: "Loading Icons",
      });

      const version = await loadLatestVersion();
      const cached = cache.get(`json-${version}`);
      const json: IconJson = cached ? JSON.parse(cached) : await loadJson(version);

      if (!cached) {
        cleanSavedPaths();
        cache.clear();
        cache.set(`json-${version}`, JSON.stringify(json));
      }

      await initSavePath(version);

      const icons = json.icons.map((icon) => ({
        ...icon,
        slug: icon.slug || titleToSlug(icon.title),
      }));

      setIsLoading(false);
      setIcons(icons);
      setVersion(version);

      await showToast({
        style: Toast.Style.Success,
        title: "",
        message: `${icons.length} icons loaded`,
      });
    })();
  }, []);

  return (
    <Grid
      columns={itemDisplayColumns[itemSize]}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setItemSize(newValue as Grid.ItemSize);
          }}
        >
          <Grid.Dropdown.Item title="Small" value="small" />
          <Grid.Dropdown.Item title="Medium" value="medium" />
          <Grid.Dropdown.Item title="Large" value="large" />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        icons.map((icon) => {
          const slug = icon.slug || titleToSlug(icon.title);

          const simpleIconsCdnLink = `https://cdn.simpleicons.org/${slug}`;
          const jsdelivrCdnLink = `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${slug}.svg`;
          const unpkgCdnLink = `https://unpkg.com/simple-icons@${version}/icons/${slug}.svg`;

          return (
            <Grid.Item
              key={slug}
              content={{
                value: {
                  source: `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${slug}.svg`,
                  tintColor: `#${icon.hex}`,
                },
                tooltip: icon.title,
              }}
              title={icon.title}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      icon={Icon.Eye}
                      title="See Detail"
                      target={
                        <Detail
                          markdown={`<img src="${jsdelivrCdnLink}?raycast-width=325&raycast-height=325&raycast-tint-color=${icon.hex}" />`}
                          navigationTitle={icon.title}
                          metadata={
                            <Detail.Metadata>
                              <Detail.Metadata.Label title="Title" text={icon.title} />
                              <Detail.Metadata.TagList title="Slug">
                                <Detail.Metadata.TagList.Item
                                  text={icon.slug}
                                  onAction={async () => {
                                    Clipboard.copy(icon.slug);
                                    await showHUD("Copied to Clipboard");
                                  }}
                                />
                              </Detail.Metadata.TagList>
                              <Detail.Metadata.TagList title="Brand color">
                                <Detail.Metadata.TagList.Item
                                  text={icon.hex}
                                  color={`#${icon.hex}`}
                                  onAction={async () => {
                                    Clipboard.copy(icon.hex);
                                    await showHUD("Copied to Clipboard");
                                  }}
                                />
                              </Detail.Metadata.TagList>
                              <Detail.Metadata.Separator />
                              <Detail.Metadata.Link title="Source" target={icon.source} text={icon.source} />
                              {icon.guidelines && (
                                <Detail.Metadata.Link
                                  title="Guidelines"
                                  target={icon.guidelines}
                                  text={icon.guidelines}
                                />
                              )}
                              {icon.license && (
                                <Detail.Metadata.Link
                                  title="License"
                                  target={icon.license.url ?? `https://spdx.org/licenses/${icon.license.type}`}
                                  text={icon.license.url ? icon.license.url : icon.license.type}
                                />
                              )}
                            </Detail.Metadata>
                          }
                          actions={
                            <ActionPanel>
                              <ActionPanel.Section>
                                <CopySvg slug={slug} version={version} />
                                <Action.CopyToClipboard title="Copy Color" content={icon.hex} />
                                <Action.CopyToClipboard
                                  title="Copy Slug"
                                  content={slug}
                                  shortcut={{ modifiers: ["opt"], key: "enter" }}
                                />
                                <Action.CopyToClipboard
                                  title="Copy CDN Link"
                                  content={simpleIconsCdnLink}
                                  shortcut={{ modifiers: ["shift"], key: "enter" }}
                                />
                                <Action.CopyToClipboard title="Copy jsDelivr CDN Link" content={jsdelivrCdnLink} />
                                <Action.CopyToClipboard
                                  // eslint-disable-next-line @raycast/prefer-title-case
                                  title="Copy unpkg CDN Link"
                                  content={unpkgCdnLink}
                                />
                              </ActionPanel.Section>
                              <ActionPanel.Section>
                                <OpenWith slug={slug} version={version} />
                              </ActionPanel.Section>
                              <ActionPanel.Section>
                                <Supports />
                              </ActionPanel.Section>
                            </ActionPanel>
                          }
                        />
                      }
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Supports />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
}
