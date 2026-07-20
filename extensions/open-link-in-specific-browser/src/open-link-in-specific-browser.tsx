import React, { useMemo, useState } from "react";
import { columns, itemInset, layout } from "./types/preferences";
import { useFrecencySorting } from "@raycast/utils";
import { Application, Color, Grid, Icon, List, showToast, Toast } from "@raycast/api";
import { OpenLinkInEmptyView } from "./components/open-link-in-empty-view";
import { ActionOnBrowser } from "./components/action-on-browser";
import { isEmpty } from "./utils/common-utils";
import { SEARCH_BAR_PLACEHOLDER, unsupportedBrowsers } from "./utils/constants";
import { tooltipsContent } from "./utils/open-link-utils";
import { useBrowsers } from "./hooks/useBrowsers";
import { useItemInput } from "./hooks/useItemInput";
import { ItemInput } from "./utils/input-utils";
import { useDefaultBrowsers } from "./hooks/useDefaultBrowsers";
import { useHiddenBrowsers } from "./hooks/useHiddenBrowsers";

export default function OpenLinkInSpecificBrowser() {
  const { data: itemInputRaw, mutate } = useItemInput();
  const { data: browsersRaw, isLoading: isBrowsersLoading } = useBrowsers();
  const { data: defaultBrowserRaw } = useDefaultBrowsers();
  const { hiddenBundleIds, hideBrowser, unhideBrowser, unhideAll, isLoading: isHiddenLoading } = useHiddenBrowsers();
  const isLoading = isBrowsersLoading || isHiddenLoading;
  const [showHidden, setShowHidden] = useState(false);

  const itemInput = useMemo(() => {
    if (!itemInputRaw) return new ItemInput();
    return itemInputRaw;
  }, [itemInputRaw]);

  const allBrowsers = useMemo(() => {
    if (!browsersRaw) return [];
    return browsersRaw.filter((browser) => browser.bundleId && unsupportedBrowsers.indexOf(browser.bundleId) === -1);
  }, [browsersRaw]);

  const visibleBrowsers = useMemo(
    () => allBrowsers.filter((browser) => !hiddenBundleIds.includes(browser.bundleId ?? "")),
    [allBrowsers, hiddenBundleIds],
  );

  const hiddenBrowsers = useMemo(
    () => allBrowsers.filter((browser) => hiddenBundleIds.includes(browser.bundleId ?? "")),
    [allBrowsers, hiddenBundleIds],
  );

  const defaultBrowser = useMemo(() => {
    if (!defaultBrowserRaw) return undefined;
    return defaultBrowserRaw;
  }, [defaultBrowserRaw]);

  const {
    data: sortedBrowsers,
    visitItem,
    resetRanking,
  } = useFrecencySorting(visibleBrowsers, { key: (browsers) => browsers.path });

  const handleHide = async (browser: Application) => {
    if (!browser.bundleId) return;
    await hideBrowser(browser.bundleId);
    await showToast({ style: Toast.Style.Success, title: `Hid ${browser.name}` });
  };

  const handleUnhide = async (browser: Application) => {
    if (!browser.bundleId) return;
    await unhideBrowser(browser.bundleId);
    await showToast({ style: Toast.Style.Success, title: `Unhid ${browser.name}` });
  };

  const handleUnhideAll = async () => {
    await unhideAll();
    await showToast({ style: Toast.Style.Success, title: "Unhid all browsers" });
  };

  const commonActionProps = {
    hasHiddenBrowsers: hiddenBrowsers.length > 0,
    showHidden,
    onToggleShowHidden: () => setShowHidden((v) => !v),
    onHide: handleHide,
    onUnhide: handleUnhide,
    onUnhideAll: handleUnhideAll,
  };

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
                {...commonActionProps}
              />
            }
          />
        ))}
      </List.Section>
      {showHidden && hiddenBrowsers.length > 0 && (
        <List.Section title="Hidden">
          {hiddenBrowsers.map((browser) => (
            <List.Item
              key={browser.path}
              title={browser.name}
              icon={{ fileIcon: browser.path }}
              accessories={[{ icon: Icon.EyeDisabled, tooltip: "Hidden" }]}
              quickLook={{ path: browser.path, name: browser.name }}
              actions={
                <ActionOnBrowser
                  browser={browser}
                  itemInput={itemInput}
                  visitItem={visitItem}
                  resetRanking={resetRanking}
                  mutate={mutate}
                  isHidden
                  {...commonActionProps}
                />
              }
            />
          ))}
        </List.Section>
      )}
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
                {...commonActionProps}
              />
            }
          />
        ))}
      </Grid.Section>
      {showHidden && hiddenBrowsers.length > 0 && (
        <Grid.Section title="Hidden">
          {hiddenBrowsers.map((browser) => (
            <Grid.Item
              key={browser.path}
              title={browser.name}
              content={{ fileIcon: browser.path }}
              quickLook={{ path: browser.path, name: browser.name }}
              accessory={{ icon: { source: Icon.EyeDisabled, tintColor: Color.SecondaryText }, tooltip: "Hidden" }}
              actions={
                <ActionOnBrowser
                  browser={browser}
                  itemInput={itemInput}
                  visitItem={visitItem}
                  resetRanking={resetRanking}
                  mutate={mutate}
                  isHidden
                  {...commonActionProps}
                />
              }
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
