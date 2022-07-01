import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { TimezoneId } from "../types/types";
import { filterTag } from "../utils/costants";
import { isEmpty } from "../utils/common-utils";
import { ListEmptyView } from "./list-empty-view";
import { Preferences } from "../types/preferences";
import { getAllTimezones, getIsShowDetail, getRegionTime } from "../hooks/hooks";
import { StarredTimeZoneListItem, TimeZoneListItem } from "./time-zone-list-item";

export function QueryWorldListLayout() {
  const { rememberTag } = getPreferenceValues<Preferences>();
  const [tag, setTag] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [refresh, setRefresh] = useState<number>(0);
  const [refreshDetail, setRefreshDetail] = useState<number>(0);
  const { showDetail } = getIsShowDetail(refreshDetail);
  const { starTimezones, timezones, loading } = getAllTimezones(refresh, region);
  const { timeInfo, detailLoading } = getRegionTime(region);
  return (
    <List
      isShowingDetail={showDetail && timezones.length !== 0}
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
          <List.Dropdown onChange={setTag} tooltip={"Filter tags"} storeValue={rememberTag}>
            {filterTag.map((value) => {
              return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
            })}
          </List.Dropdown>
        ) : null
      }
    >
      <ListEmptyView title={"No timezones"} command={true} extension={true} />
      {(tag === "All" || tag === "Starred") && (
        <List.Section title={"Starred"}>
          {starTimezones.map((value, index) => {
            return (
              <StarredTimeZoneListItem
                key={index}
                index={index}
                timezone={value.timezone}
                timeInfo={timeInfo}
                detailLoading={detailLoading}
                starTimezones={starTimezones}
                setRefresh={setRefresh}
                setRefreshDetail={setRefreshDetail}
                showDetail={showDetail}
              />
            );
          })}
        </List.Section>
      )}
      {(tag === "All" || tag === "Other" || starTimezones.length === 0) && (
        <List.Section title={starTimezones.length === 0 ? "All" : "Other"}>
          {timezones.map((value, index) => {
            return (
              <TimeZoneListItem
                key={index}
                timezone={value}
                timeInfo={timeInfo}
                detailLoading={detailLoading}
                starTimezones={starTimezones}
                setRefresh={setRefresh}
                setRefreshDetail={setRefreshDetail}
                showDetail={showDetail}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
