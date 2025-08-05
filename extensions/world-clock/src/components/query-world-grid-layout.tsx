import { Grid } from "@raycast/api";
import { useMemo, useState } from "react";
import { TimezoneId } from "../types/types";
import { filterTag } from "../utils/costants";
import { isEmpty } from "../utils/common-utils";
import { columns, rememberTag } from "../types/preferences";
import { StarredTimeZoneGridItem, TimeZoneGridItem } from "./time-zone-grid-item";
import { GridEmptyView } from "./grid-empty-view";
import { useAllTimezones } from "../hooks/useAllTimezones";
import { useStarTimezones } from "../hooks/useStarTimezones";
import { useCurrentTime } from "../hooks/useCurrentTime";

export function QueryWorldGridLayout() {
  const [tag, setTag] = useState<string>("");
  const [region, setRegion] = useState<string>("");

  const { data: allTimezonesData, isLoading: allTimezonesLoading } = useAllTimezones();

  const timezones = Array.isArray(allTimezonesData) ? allTimezonesData : [];

  const { data: starTimezonesData, isLoading: starTimezonesLoading, mutate: starTimezonesMutate } = useStarTimezones();

  const mutate = async () => {
    await starTimezonesMutate();
  };

  const starTimezones = Array.isArray(starTimezonesData) ? starTimezonesData : [];

  const { data: currentTimeData } = useCurrentTime(region);
  const currentTime = useMemo(() => {
    return currentTimeData || undefined;
  }, [currentTimeData]);

  return (
    <Grid
      inset={Grid.Inset.Small}
      columns={parseInt(columns)}
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
          <Grid.Dropdown onChange={setTag} tooltip={"Filter tags"} storeValue={rememberTag}>
            {filterTag.map((value) => {
              return <Grid.Dropdown.Item key={value.value} title={value.title} value={value.value} icon={value.icon} />;
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
                timezone={value}
                currentTime={currentTime}
                starTimezones={starTimezones}
                mutate={mutate}
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
                index={index}
                timezone={value}
                currentTime={currentTime}
                starTimezones={starTimezones}
                mutate={mutate}
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
