import { getPreferenceValues, Grid } from "@raycast/api";
import { useState } from "react";
import { TimezoneId } from "../types/types";
import { filterTag } from "../utils/costants";
import { isEmpty } from "../utils/common-utils";
import { Preferences } from "../types/preferences";
import { getAllTimezones, getRegionTime } from "../hooks/hooks";
import { StarredTimeZoneGridItem, TimeZoneGridItem } from "./time-zone-grid-item";
import { GridEmptyView } from "./grid-empty-view";

export function QueryWorldGridLayout() {
  const { rememberTag, itemSize } = getPreferenceValues<Preferences>();
  const [tag, setTag] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [refresh, setRefresh] = useState<number>(0);
  const showDetail = false;
  const setRefreshDetail = () => {
    return;
  };
  const { starTimezones, timezones, loading } = getAllTimezones(refresh, region);
  const { timeInfo } = getRegionTime(region);
  return (
    <Grid
      inset={Grid.Inset.Small}
      itemSize={itemSize as Grid.ItemSize}
      isLoading={loading || (starTimezones.length !== 0 && tag === "")}
      searchBarPlaceholder={"Search timezones"}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined" && !isEmpty(id)) {
          setRegion((JSON.parse(id) as TimezoneId).region);
        }
      }}
      throttle={true}
      searchBarAccessory={
        starTimezones.length !== 0 ? (
          <Grid.Dropdown onChange={setTag} tooltip={"Filter tags"} storeValue={rememberTag}>
            {filterTag.map((value) => {
              return <Grid.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
            })}
          </Grid.Dropdown>
        ) : null
      }
    >
      <GridEmptyView title={"No timezones"} command={true} extension={true} />
      {(tag === "All" || tag === "Starred") && (
        <Grid.Section title={"Starred"}>
          {starTimezones.map((value, index) => {
            return (
              <StarredTimeZoneGridItem
                key={index}
                index={index}
                timezone={value.timezone}
                timeInfo={timeInfo}
                starTimezones={starTimezones}
                setRefresh={setRefresh}
                setRefreshDetail={setRefreshDetail}
                showDetail={showDetail}
              />
            );
          })}
        </Grid.Section>
      )}
      {(tag === "All" || tag === "Other" || starTimezones.length === 0) && (
        <Grid.Section title={starTimezones.length === 0 ? "All" : "Other"}>
          {timezones.map((value, index) => {
            return (
              <TimeZoneGridItem
                key={index}
                timezone={value}
                timeInfo={timeInfo}
                starTimezones={starTimezones}
                setRefresh={setRefresh}
                setRefreshDetail={setRefreshDetail}
                showDetail={showDetail}
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
