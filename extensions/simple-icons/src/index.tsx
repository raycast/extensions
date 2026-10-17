import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Grid,
  Icon,
  LaunchProps,
  Toast,
  confirmAlert,
  open,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import debounce from "lodash/debounce.js";
import { getIconSlug } from "./vender/simple-icons-sdk.js";
import { CopyFontEntities, LaunchCommand, Supports, actions, defaultActionsOrder } from "./actions.js";
import {
  cacheAssetPack,
  copyOrPaste,
  defaultDetailAction,
  displaySimpleIconsFontFeatures,
  enableAiSearch,
  getAliases,
  getRelativeFileLink,
  loadCachedJson,
  shuffleOnStart,
  useSearch,
  useVersion,
} from "./utils.js";
import { IconData, LaunchContext } from "./types.js";
import { arrayToShuffled } from "array-shuffle";

const itemDisplayColumns = {
  small: 8,
  medium: 5,
  large: 3,
} as const;

export default function Command({ launchContext }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const [itemSize, setItemSize] = useState<keyof typeof itemDisplayColumns>("small");
  const [isLoading, setIsLoading] = useState(true);
  const [iconPack, setIconPack] = useState<{ version: string; icons: IconData[] }>({ version: "", icons: [] });
  const { version, icons } = iconPack;
  const { aiIsLoading, searchResult, setSearchString } = useSearch({ icons });
  const requestedVersion = useVersion();

  useEffect(() => {
    const controller = new AbortController();
    const fetchIcons = async (version: string) => {
      setIsLoading(true);

      await showToast({
        style: Toast.Style.Animated,
        title: "Loading Icons",
      });

      if (controller.signal.aborted) return;
      await cacheAssetPack(version, controller.signal);
      if (controller.signal.aborted) return;
      const json = await loadCachedJson(version);
      if (controller.signal.aborted) return;
      if (json.length === 0) throw new Error("Downloaded asset pack contains no icons");
      const icons = json.map((icon) => ({
        ...icon,
        slug: getIconSlug(icon, version),
      }));

      // Publish the icons and their file version together only after loading
      // succeeds. A failed update leaves the working pack and actions intact.
      setIconPack({ version, icons: shuffleOnStart ? arrayToShuffled(icons) : icons });
      await showToast({
        style: Toast.Style.Success,
        title: `${icons.length} icons loaded`,
        message: version,
      });
    };
    if (requestedVersion) {
      fetchIcons(requestedVersion)
        .catch((error) => {
          if (!controller.signal.aborted) showFailureToast(error, { title: "Failed to fetch icons" });
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }
    return () => {
      controller.abort();
    };
  }, [requestedVersion]);

  const DefaultAction = actions[defaultDetailAction];

  const restActions = defaultActionsOrder
    .filter((id) => id !== defaultDetailAction)
    .map((actionId) => {
      return actions[actionId];
    });

  if (aiIsLoading && searchResult.length === 0) {
    return (
      <Grid isLoading={aiIsLoading} onSearchTextChange={setSearchString}>
        <Grid.EmptyView icon={Icon.Stars} title="Searching through AI..." />
      </Grid>
    );
  }

  return (
    <Grid
      navigationTitle={
        launchContext?.launchFromExtensionTitle ? `Pick icon for ${launchContext.launchFromExtensionTitle}` : undefined
      }
      columns={itemDisplayColumns[itemSize]}
      inset={Grid.Inset.Small}
      isLoading={isLoading || aiIsLoading}
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
      onSearchTextChange={debounce(setSearchString, 300)}
      actions={
        enableAiSearch && icons.length > 0 && searchResult.length === 0 ? (
          <ActionPanel>
            <Action
              icon={Icon.Stars}
              title="Try AI Search"
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Pro Feature Required",
                  message:
                    "This feature requires Raycast Pro subscription. Do you want to open Raycast Pro page? (You can hide this Pro feature in preferences)",
                });
                if (confirmed) open("https://raycast.com/pro?via=litomore");
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {(!isLoading || !aiIsLoading || !version) &&
        // Limit to 500 icons to avoid performance issues
        searchResult.slice(0, 500).map((icon) => {
          const slug = getIconSlug(icon);
          const fileLink = getRelativeFileLink(slug, version);
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
                          markdown={`<img src="${fileLink}?raycast-width=325&raycast-height=325&raycast-tint-color=${encodeURIComponent(`#${icon.hex}`)}" />`}
                          navigationTitle={icon.title}
                          metadata={
                            <Detail.Metadata>
                              <Detail.Metadata.TagList title="Title">
                                <Detail.Metadata.TagList.Item
                                  text={icon.title}
                                  onAction={() => copyOrPaste(icon.title)}
                                />
                              </Detail.Metadata.TagList>
                              {aliases.length > 0 && (
                                <Detail.Metadata.TagList title="Aliases">
                                  {aliases.map((alias) => (
                                    <Detail.Metadata.TagList.Item
                                      key={alias}
                                      text={alias}
                                      onAction={() => copyOrPaste(alias)}
                                    />
                                  ))}
                                </Detail.Metadata.TagList>
                              )}
                              <Detail.Metadata.TagList title="Slug">
                                <Detail.Metadata.TagList.Item
                                  text={icon.slug}
                                  onAction={() => copyOrPaste(icon.slug)}
                                />
                              </Detail.Metadata.TagList>
                              <Detail.Metadata.TagList title="Brand color">
                                <Detail.Metadata.TagList.Item
                                  text={icon.hex}
                                  color={`#${icon.hex}`}
                                  onAction={() => copyOrPaste(icon.hex)}
                                />
                              </Detail.Metadata.TagList>
                              <Detail.Metadata.Separator />
                              {icon.source && (
                                <Detail.Metadata.Link title="Source" target={icon.source} text={icon.source} />
                              )}
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
                                    icon={{ ...icon, slug: getIconSlug(icon) }}
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
                              {displaySimpleIconsFontFeatures && (
                                <ActionPanel.Section>
                                  <CopyFontEntities icon={icon} version={version} />
                                </ActionPanel.Section>
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
