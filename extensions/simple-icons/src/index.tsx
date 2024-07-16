import { useEffect, useState } from "react";
import { setTimeout } from "node:timers/promises";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Grid,
  Icon,
  LaunchProps,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { titleToSlug } from "simple-icons/sdk";
import { LaunchCommand, Supports, actions, defaultActionsOrder } from "./actions.js";
import { cacheAssetPack, getAliases, loadCachedJson, useVersion } from "./utils.js";
import { IconData, LaunchContext } from "./types.js";

const itemDisplayColumns = {
  small: 8,
  medium: 5,
  large: 3,
} as const;

export default function Command({ launchContext }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const [itemSize, setItemSize] = useState<keyof typeof itemDisplayColumns>("small");
  const [isLoading, setIsLoading] = useState(true);
  const [icons, setIcons] = useState<IconData[]>([]);
  const version = useVersion({ launchContext });

  const fetchIcons = async (version: string) => {
    setIsLoading(true);
    setIcons([]);

    await showToast({
      style: Toast.Style.Animated,
      title: "",
      message: "Loading Icons",
    });

    await cacheAssetPack(version).catch(async () => {
      await showToast({
        style: Toast.Style.Failure,
        title: "",
        message: "Failed to download icons asset",
      });
      await setTimeout(1200);
    });
    const json = await loadCachedJson(version).catch(() => {
      return { icons: [] };
    });
    const icons = json.icons.map((icon) => ({
      ...icon,
      slug: icon.slug || titleToSlug(icon.title),
    }));

    setIcons(icons);
    setIsLoading(false);

    if (icons.length > 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "",
        message: `${icons.length} icons loaded`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "",
        message: "Unable to load icons",
      });
    }
  };

  useEffect(() => {
    if (version) {
      fetchIcons(version);
    }
  }, [version]);

  const { defaultDetailAction = "OpenWith" } = getPreferenceValues<ExtensionPreferences>();
  const DefaultAction = actions[defaultDetailAction];

  const restActions = defaultActionsOrder
    .filter((id) => id !== defaultDetailAction)
    .map((actionId) => {
      return actions[actionId];
    });

  return (
    <Grid
      navigationTitle={
        launchContext?.launchFromExtensionTitle ? `Pick icon for ${launchContext.launchFromExtensionTitle}` : undefined
      }
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
      {(!isLoading || !version) &&
        icons.map((icon) => {
          const slug = icon.slug || titleToSlug(icon.title);

          const fileLink = `pack/simple-icons-${version}/icons/${slug}.svg`;
          const aliases = getAliases(icon);

          return (
            <Grid.Item
              key={slug}
              content={{
                value: {
                  source: fileLink,
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
                          markdown={`<img src="${fileLink}?raycast-width=325&raycast-height=325&raycast-tint-color=${icon.hex}" />`}
                          navigationTitle={icon.title}
                          metadata={
                            <Detail.Metadata>
                              <Detail.Metadata.Label title="Title" text={icon.title} />
                              {aliases.length > 0 && (
                                <Detail.Metadata.TagList title="Aliases">
                                  {aliases.map((alias) => (
                                    <Detail.Metadata.TagList.Item
                                      key={alias}
                                      text={alias}
                                      onAction={async () => {
                                        Clipboard.copy(alias);
                                        await showHUD("Copied to Clipboard");
                                      }}
                                    />
                                  ))}
                                </Detail.Metadata.TagList>
                              )}
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
                              {launchContext && (
                                <ActionPanel.Section>
                                  <LaunchCommand
                                    callbackLaunchOptions={launchContext.callbackLaunchOptions}
                                    icon={{ ...icon, slug: icon.slug || titleToSlug(icon.title) }}
                                    version={version}
                                  />
                                </ActionPanel.Section>
                              )}
                              {(!launchContext || launchContext?.showCopyActions) && (
                                <>
                                  <ActionPanel.Section>
                                    <DefaultAction icon={icon} version={version} />
                                  </ActionPanel.Section>
                                  <ActionPanel.Section>
                                    {restActions.map((A, index) => (
                                      <A key={`action-String(${index})`} icon={icon} version={version} />
                                    ))}
                                  </ActionPanel.Section>
                                </>
                              )}
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
