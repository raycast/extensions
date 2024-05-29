import React, { useState } from "react";
import { useBrowsers, useItemInput } from "./hooks/hooks";
import { columns, itemInset, layout } from "./types/preferences";
import { useFrecencySorting } from "@raycast/utils";
import { Grid, Icon, List } from "@raycast/api";
import { OpenLinkInEmptyView } from "./components/open-link-in-empty-view";
import { ActionOnBrowser } from "./components/action-on-browser";
import { isEmpty } from "./utils/common-utils";
import { SEARCH_BAR_PLACEHOLDER } from "./utils/constants";
import { tooltipsContent } from "./utils/open-link-utils";

export default function OpenLinkInSpecificBrowser() {
  const [refresh, setRefresh] = useState<number>(0);
  const { itemInput } = useItemInput(refresh);
  const { browsers, defaultBrowser, loading } = useBrowsers(itemInput, refresh);
  const { data, visitItem, resetRanking } = useFrecencySorting(browsers, { key: (browsers) => browsers.path });

  return layout === "List" ? (
    <List isLoading={loading} searchBarPlaceholder={SEARCH_BAR_PLACEHOLDER}>
      <OpenLinkInEmptyView />
      <List.Section title={tooltipsContent(itemInput)}>
        {data.map((browser) => (
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
                setRefresh={setRefresh}
                visitItem={visitItem}
                resetRanking={resetRanking}
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
      isLoading={loading}
      searchBarPlaceholder={SEARCH_BAR_PLACEHOLDER}
    >
      <OpenLinkInEmptyView />
      <Grid.Section title={tooltipsContent(itemInput)}>
        {data.map((browser) => (
          <Grid.Item
            key={browser.path}
            title={browser.name}
            content={{ fileIcon: browser.path }}
            quickLook={{ path: browser.path, name: browser.name }}
            accessory={defaultBrowser?.path === browser.path ? { icon: Icon.Compass, tooltip: "Default" } : undefined}
            actions={
              <ActionOnBrowser
                browser={browser}
                itemInput={itemInput}
                setRefresh={setRefresh}
                visitItem={visitItem}
                resetRanking={resetRanking}
              />
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
