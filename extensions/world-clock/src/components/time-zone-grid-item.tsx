import { Grid } from "@raycast/api";
import { Dispatch, SetStateAction } from "react";
import { TimeInfo, Timezone } from "../types/types";
import { buildFullDateTime, buildIntervalTime, isEmpty } from "../utils/common-utils";
import { ActionOnTimezone } from "./action-on-timezone";
import { ActionOnStarredTimezone } from "./action-on-starred-timezone";

export function TimeZoneGridItem(props: {
  timezone: string;
  timeInfo: TimeInfo;
  starTimezones: Timezone[];
  setRefresh: Dispatch<SetStateAction<number>>;
  setRefreshDetail: Dispatch<SetStateAction<number>>;
  showDetail: boolean;
}) {
  const { timezone, timeInfo, starTimezones, setRefresh, setRefreshDetail, showDetail } = props;
  return (
    <Grid.Item
      id={JSON.stringify({ type: "all", region: timezone })}
      content={
        timeInfo.timezone === timezone
          ? {
              value: {
                source: {
                  light: `clock-icons/${new Date(timeInfo.datetime).getHours()}.svg`,
                  dark: `clock-icons@dark/${new Date(timeInfo.datetime).getHours()}.svg`,
                },
              },
              tooltip: timeInfo.datetime + buildIntervalTime(timeInfo.datetime),
            }
          : {
              source: {
                light: "timezone-icon.svg",
                dark: "timezone-icon@dark.svg",
              },
            }
      }
      title={timezone}
      actions={
        <ActionOnTimezone
          timeInfo={timeInfo}
          starTimezones={starTimezones}
          timezone={timezone}
          setRefresh={setRefresh}
          showDetail={showDetail}
          setRefreshDetail={setRefreshDetail}
        />
      }
    />
  );
}

export function StarredTimeZoneGridItem(props: {
  index: number;
  timezone: string;
  timeInfo: TimeInfo;
  starTimezones: Timezone[];
  setRefresh: Dispatch<SetStateAction<number>>;
  setRefreshDetail: Dispatch<SetStateAction<number>>;
  showDetail: boolean;
}) {
  const { index, timezone, timeInfo, starTimezones, setRefresh, setRefreshDetail, showDetail } = props;
  const keywords = timezone.toLowerCase().split("/");
  return (
    <Grid.Item
      id={JSON.stringify({ type: "star", region: timezone })}
      content={{
        value: {
          source: {
            light: `clock-icons/${new Date(starTimezones[index].unixtime).getHours()}.svg`,
            dark: `clock-icons@dark/${new Date(starTimezones[index].unixtime).getHours()}.svg`,
          },
        },
        tooltip: `${starTimezones[index].timezone}
${buildFullDateTime(new Date(starTimezones[index].unixtime))}${buildIntervalTime(starTimezones[index].unixtime)}
${!isEmpty(starTimezones[index].memo) ? "_".repeat(10) : ""}

${!isEmpty(starTimezones[index].memo) ? "Meme: " + starTimezones[index].memo : ""}`,
      }}
      keywords={keywords}
      title={isEmpty(starTimezones[index].alias) ? timezone : starTimezones[index].alias + ""}
      subtitle={starTimezones[index].date_time + buildIntervalTime(starTimezones[index].unixtime)}
      actions={
        <ActionOnStarredTimezone
          timeInfo={timeInfo}
          index={index}
          starTimezones={starTimezones}
          timezone={timezone}
          setRefresh={setRefresh}
          showDetail={showDetail}
          setRefreshDetail={setRefreshDetail}
        />
      }
    />
  );
}
