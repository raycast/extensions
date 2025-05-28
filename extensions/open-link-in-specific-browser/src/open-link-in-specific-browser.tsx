import React, { useMemo } from "react";
import { columns, itemInset, layout } from "./types/preferences";
import { useFrecencySorting } from "@raycast/utils";
import { Color, Grid, Icon, List } from "@raycast/api";
import { OpenLinkInEmptyView } from "./components/open-link-in-empty-view";
import { ActionOnBrowser } from "./components/action-on-browser";
import { isEmpty } from "./utils/common-utils";
import { SEARCH_BAR_PLACEHOLDER, unsupportedBrowsers } from "./utils/constants";
import { tooltipsContent } from "./utils/open-link-utils";
import { useBrowsers } from "./hooks/useBrowsers";
import { useItemInput } from "./hooks/useItemInput";
import { ItemInput } from "./utils/input-utils";
import { useDefaultBrowsers } from "./hooks/useDefaultBrowsers";

export default function OpenLinkInSpecificBrowser() {
  const { data: itemInputRaw, mutate } = useItemInput();
  const { data: browsersRaw, isLoading } = useBrowsers();
  const { data: defaultBrowserRaw } = useDefaultBrowsers();

  const itemInput = useMemo(() => {
    if (!itemInputRaw) return new ItemInput();
    return itemInputRaw;
  }, [itemInputRaw]);

  const browsers = useMemo(() => {
    if (!browsersRaw) return [];

    return browsersRaw.filter((browser) => browser.bundleId && unsupportedBrowsers.indexOf(browser.bundleId) === -1);
  }, [browsersRaw]);

  const defaultBrowser = useMemo(() => {
    if (!defaultBrowserRaw) return undefined;
    return defaultBrowserRaw;
  }, [defaultBrowserRaw]);

  const {
    data: sortedBrowsers,
    visitItem,
    resetRanking,
  } = useFrecencySorting(browsers, { key: (browsers) => browsers.path });

  return layout === "List" ? (
    <List isLoading={isLoading} searchBarPlaceholder={SEARCH_BAR_PLACEHOLDER}>
      <OpenLinkInEmptyView />
      <List.Section title={tooltipsContent(itemInput)}>
        {sortedBrowsers.map((browser) => (
          <List.Item
            key={browser.path}
            title={browser.name}
            icon={{ fileIcon: browser.path }}
            accessories={defaultBrowser?.path === browser.path ? [{ icon: Icon.Compass, tooltip: "Default" }] : []}
            quickLook={{ path: browser.path, name: browser.name }}
            actions={
              <ActionOnBrowser
                browser={browser}
                itemInput={itemInput}
                visitItem={visitItem}
                resetRanking={resetRanking}
                mutate={mutate}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  ) : (
    <Grid
      columns={parseInt(columns)}
      inset={isEmpty(itemInset) ? undefined : (itemInset as Grid.Inset)}
      isLoading={isLoading}
      searchBarPlaceholder={SEARCH_BAR_PLACEHOLDER}
    >
      <OpenLinkInEmptyView />
      <Grid.Section title={tooltipsContent(itemInput)}>
        {sortedBrowsers.map((browser) => (
          <Grid.Item
            key={browser.path}
            title={browser.name}
            content={{ fileIcon: browser.path }}
            quickLook={{ path: browser.path, name: browser.name }}
            accessory={
              defaultBrowser?.path === browser.path
                ? { icon: { source: Icon.Compass, tintColor: Color.SecondaryText }, tooltip: "Default Browser" }
                : undefined
            }
            actions={
              <ActionOnBrowser
                browser={browser}
                itemInput={itemInput}
                visitItem={visitItem}
                resetRanking={resetRanking}
                mutate={mutate}
              />
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
