import { List } from "@raycast/api";
import { useMemo, useState } from "react";
import { CurrentTime, TimezoneId } from "../types/types";
import { filterTag } from "../utils/costants";
import { isEmpty } from "../utils/common-utils";
import { ListEmptyView } from "./list-empty-view";
import { StarredTimeZoneListItem, TimeZoneListItem } from "./time-zone-list-item";
import { useShowDetail } from "../hooks/useShowDetail";
import { rememberTag } from "../types/preferences";
import { useStarTimezones } from "../hooks/useStarTimezones";
import { useAllTimezones } from "../hooks/useAllTimezones";
import { useCurrentTime } from "../hooks/useCurrentTime";

export function QueryWorldListLayout() {
  const [tag, setTag] = useState<string>("");
  const [region, setRegion] = useState<string>("");

  const { data: allTimezonesData, isLoading: allTimezonesLoading } = useAllTimezones();
  const timezones = useMemo(() => {
    return allTimezonesData || [];
  }, [allTimezonesData]);

  const { data: starTimezonesData, isLoading: starTimezonesLoading, mutate: starTimezonesMutate } = useStarTimezones();

  const mutate = async () => {
    await starTimezonesMutate();
  };
  const starTimezones = useMemo(() => {
    return starTimezonesData || [];
  }, [starTimezonesData]);

  const { data: showDetailData, mutate: showDetailMutate } = useShowDetail();
  const showDetail = useMemo(() => {
    return showDetailData || false;
  }, [showDetailData]);

  const { data: currentTimeData, isLoading: detailLoading } = useCurrentTime(region);
  const currentTime = useMemo(() => {
    return currentTimeData || ({} as CurrentTime);
  }, [currentTimeData]);

  return (
    <List
      isShowingDetail={showDetail && timezones.length !== 0}
      isLoading={starTimezonesLoading || allTimezonesLoading}
      searchBarPlaceholder={"Search timezones"}
      onSelectionChange={(id) => {
        if (typeof id === "string" && !isEmpty(id)) {
          setRegion((JSON.parse(id) as TimezoneId).region);
        }
      }}
      throttle={true}
      searchBarAccessory={
        starTimezones.length !== 0 ? (
          <List.Dropdown onChange={setTag} tooltip={"Filter tags"} storeValue={rememberTag}>
            {filterTag.map((value) => {
              return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} icon={value.icon} />;
            })}
          </List.Dropdown>
        ) : undefined
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
                currentTime={currentTime}
                timezone={value}
                detailLoading={detailLoading}
                starTimezones={starTimezones}
                mutate={mutate}
                showDetailMutate={showDetailMutate}
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
                index={index}
                timezone={value}
                currentTime={currentTime}
                detailLoading={detailLoading}
                starTimezones={starTimezones}
                mutate={mutate}
                showDetailMutate={showDetailMutate}
                showDetail={showDetail}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
