import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { TimeInfo } from "../types/types";
import { TimeInfoDetail } from "./time-info-detail";
import { LOCALSTORAGE_KEY } from "../utils/costants";
import { ActionTimeInfo } from "./action-time-info";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { buildTimeByUTCTime } from "../utils/common-utils";

export function TimeZoneListItem(props: {
  timezone: string;
  timeInfo: TimeInfo;
  detailLoading: boolean;
  starTimezones: string[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { timezone, timeInfo, detailLoading, starTimezones, setRefresh } = props;
  return (
    <List.Item
      id={JSON.stringify({ type: "all", region: timezone })}
      icon={{ source: { light: "timezone.png", dark: "timezone@dark.png" } }}
      title={timezone}
      accessories={[
        timeInfo.timezone === timezone ? { text: buildTimeByUTCTime(timeInfo.datetime).substring(11) } : {},
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
              if (!starTimezones.includes(timezone)) {
                const _starTimezones = [...starTimezones];
                _starTimezones.push(timezone);
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

export function StarTimeZoneListItem(props: {
  timezone: string;
  timeInfo: TimeInfo;
  detailLoading: boolean;
  starTimezones: string[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { timezone, timeInfo, detailLoading, starTimezones, setRefresh } = props;
  return (
    <List.Item
      id={JSON.stringify({ type: "star", region: timezone })}
      icon={{ source: { light: "timezone.png", dark: "timezone@dark.png" }, tintColor: Color.Yellow }}
      title={timezone}
      accessories={[
        timeInfo.timezone === timezone ? { text: buildTimeByUTCTime(timeInfo.datetime).substring(11) } : {},
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
              if (starTimezones.includes(timezone)) {
                const _starTimezones = [...starTimezones];
                _starTimezones.splice(_starTimezones.indexOf(timezone), 1);
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
