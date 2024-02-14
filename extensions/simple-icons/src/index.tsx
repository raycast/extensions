import { useEffect, useState } from "react";
import { ActionPanel, Action, Grid, Icon, Detail, Color, Clipboard, Cache, Toast, showToast } from "@raycast/api";
import { titleToSlug } from "simple-icons/sdk";
import { loadLatestVersion, loadJson, loadSvg } from "./utils";
import { IconJson, IconData } from "./types";
import packageJson from "../package.json";

export default function Command() {
  const [itemSize, setItemSize] = useState<Grid.ItemSize>(Grid.ItemSize.Small);
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
      const cached = await cache.get(`json-${version}`);

      const json: IconJson = cached ? JSON.parse(cached) : await loadJson(version);

      if (!cached) {
        cache.clear();
        cache.set(`json-${version}`, JSON.stringify(json));
      }

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
        message: `Loaded ${icons.length} icons`,
      });
    })();
  }, []);

  return (
    <Grid
      itemSize={itemSize}
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
          <Grid.Dropdown.Item title="Small" value={Grid.ItemSize.Small} />
          <Grid.Dropdown.Item title="Medium" value={Grid.ItemSize.Medium} />
          <Grid.Dropdown.Item title="Large" value={Grid.ItemSize.Large} />
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        icons.map((icon) => {
          const slug = icon.slug || titleToSlug(icon.title);

          return (
            <Grid.Item
              key={slug}
              content={{
                value: {
                  source: `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${slug}.svg`,
                  tintColor: Color.PrimaryText,
                },
                tooltip: icon.title,
              }}
              title={icon.title}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Eye}
                    title="See Detail"
                    target={
                      <Detail
                        markdown={`<img src="https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${slug}.svg?raycast-width=235&raycast-height=235"  />`}
                        navigationTitle={icon.title}
                        metadata={
                          <Detail.Metadata>
                            <Detail.Metadata.Label title="Title" text={icon.title} />
                            <Detail.Metadata.Label title="Slug" text={slug} />
                            <Detail.Metadata.TagList title="Brand color">
                              <Detail.Metadata.TagList.Item text={icon.hex} color={`#${icon.hex}`} />
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
                            <Action
                              title="Copy SVG"
                              onAction={async () => {
                                const svg = await loadSvg(version, slug);
                                Clipboard.copy(svg);
                              }}
                              icon={Icon.Clipboard}
                            />
                            <Action.CopyToClipboard title="Copy Color" content={icon.hex} />
                            <Action.CopyToClipboard
                              title="Copy Slug"
                              content={slug}
                              shortcut={{ modifiers: ["opt"], key: "enter" }}
                            />
                            <Action.CopyToClipboard
                              title="Copy CDN Link"
                              content={`https://cdn.simpleicons.org/${slug}`}
                              shortcut={{ modifiers: ["shift"], key: "enter" }}
                            />
                            <Action.CopyToClipboard
                              title="Copy jsDelivr CDN Link"
                              content={`https://cdn.jsdelivr.net/npm/simple-icons@${packageJson.dependencies["simple-icons"]}/icons/${slug}.svg`}
                            />
                            <Action.CopyToClipboard
                              // eslint-disable-next-line @raycast/prefer-title-case
                              title="Copy unpkg CDN Link"
                              content={`https://unpkg.com/simple-icons@${packageJson.dependencies["simple-icons"]}/icons/${slug}.svg`}
                            />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
}
