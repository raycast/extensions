import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { TimeInfo, Timezone } from "../types/types";
import { TimeInfoDetail } from "./time-info-detail";
import { LOCALSTORAGE_KEY } from "../utils/costants";
import { ActionTimeInfo } from "./action-time-info";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { calculateTimeInfoByOffset } from "../utils/common-utils";

export function TimeZoneListItem(props: {
  timezone: string;
  timeInfo: TimeInfo;
  detailLoading: boolean;
  starTimezones: Timezone[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { timezone, timeInfo, detailLoading, starTimezones, setRefresh } = props;
  return (
    <List.Item
      id={JSON.stringify({ type: "all", region: timezone })}
      icon={{ source: { light: "timezone.png", dark: "timezone@dark.png" } }}
      title={timezone}
      accessories={[
        timezone === timeInfo.timezone
          ? {
              text: calculateTimeInfoByOffset(timeInfo.unixtime, timeInfo.utc_offset).time,
              tooltip: timeInfo.datetime,
            }
          : {},
      ]}
      detail={<TimeInfoDetail timeInfo={timeInfo} detailLoading={detailLoading} />}
      actions={
        <ActionPanel>
          <ActionTimeInfo timeInfo={timeInfo} />
          <Action
            icon={Icon.Star}
            title={"Star Timezone"}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => {
              if (starTimezones.filter((value) => value.timezone === timezone).length <= 0) {
                const _starTimezones = [...starTimezones];
                _starTimezones.push({
                  timezone: timezone,
                  utc_offset: timeInfo.utc_offset,
                  date_time: "",
                  unixtime: 0,
                });
                await LocalStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(_starTimezones)).then(() => {
                  setRefresh(Date.now());
                });
              }
            }}
          />
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    />
  );
}

export function StarredTimeZoneListItem(props: {
  index: number;
  timezone: string;
  timeInfo: TimeInfo;
  detailLoading: boolean;
  starTimezones: Timezone[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { index, timezone, timeInfo, detailLoading, starTimezones, setRefresh } = props;
  return (
    <List.Item
      id={JSON.stringify({ type: "star", region: timezone })}
      icon={{ source: { light: "timezone.png", dark: "timezone@dark.png" }, tintColor: Color.Yellow }}
      title={timezone}
      accessories={[
        { text: starTimezones[index].date_time, tooltip: new Date(starTimezones[index].unixtime).toLocaleString() },
      ]}
      detail={<TimeInfoDetail timeInfo={timeInfo} detailLoading={detailLoading} />}
      actions={
        <ActionPanel>
          <ActionTimeInfo timeInfo={timeInfo} />
          <Action
            icon={Icon.Star}
            title={"Unstar Timezone"}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
            onAction={async () => {
              if (starTimezones.filter((value) => value.timezone === timezone).length >= 0) {
                const _starTimezones = [...starTimezones];
                _starTimezones.splice(index, 1);
                await LocalStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(_starTimezones)).then(() => {
                  setRefresh(Date.now());
                });
              }
            }}
          />
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    />
  );
}
