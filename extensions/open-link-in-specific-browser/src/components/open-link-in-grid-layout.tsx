import { ItemInput } from "../utils/input-utils";
import React from "react";
import { getPreferenceValues, Grid } from "@raycast/api";
import { isEmpty } from "../utils/common-utils";
import { OpenLinkAppGridItem } from "./open-link-app-grid-item";
import { Preferences } from "../types/preferences";
import { OpenLinkInEmptyView } from "./open-link-in-empty-view";
import { OpenLinkApplication } from "../types/types";
import { actionTitle, searchBarPlaceholder } from "../utils/open-link-utils";

export function OpenLinkInGridLayout(props: {
  buildInApps: OpenLinkApplication[];
  customApps: OpenLinkApplication[];
  otherApps: OpenLinkApplication[];
  itemInput: ItemInput;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
}) {
  const { itemSize, itemInset } = getPreferenceValues<Preferences>();
  const { buildInApps, customApps, otherApps, itemInput, setRefresh, loading } = props;

  return (
    <Grid
      itemSize={itemSize as Grid.ItemSize}
      inset={isEmpty(itemInset) ? undefined : (itemInset as Grid.Inset)}
      isLoading={loading}
      searchBarPlaceholder={searchBarPlaceholder(itemInput)}
    >
      <OpenLinkInEmptyView />

      <Grid.Section title="Custom Apps" subtitle={itemInput.type + ": " + itemInput.content.substring(0, 90)}>
        {customApps.map((browser, index) => {
          return (
            <OpenLinkAppGridItem
              key={browser.path}
              isCustom={true}
              itemInput={itemInput}
              setRefresh={setRefresh}
              index={index}
              openLinkApplications={customApps}
            />
          );
        })}
      </Grid.Section>
      <Grid.Section
        title="Build-in Apps"
        subtitle={customApps.length === 0 ? itemInput.type + ": " + itemInput.content.substring(0, 90) : ""}
      >
        {buildInApps.map((browser, index) => {
          return (
            <OpenLinkAppGridItem
              key={browser.path}
              isCustom={false}
              itemInput={itemInput}
              setRefresh={setRefresh}
              index={index}
              openLinkApplications={buildInApps}
            />
          );
        })}
      </Grid.Section>
      <Grid.Section title="Other Apps">
        {otherApps.map((browser, index) => {
          return (
            <OpenLinkAppGridItem
              key={browser.path}
              isCustom={false}
              itemInput={itemInput}
              setRefresh={setRefresh}
              index={index}
              openLinkApplications={otherApps}
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}
