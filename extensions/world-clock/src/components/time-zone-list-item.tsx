import { Action, ActionPanel, Icon, Image, List, LocalStorage } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { TimeInfo, Timezone } from "../types/types";
import { TimeInfoDetail } from "./time-info-detail";
import { LOCALSTORAGE_KEY } from "../utils/costants";
import { ActionTimeInfo } from "./action-time-info";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { calculateTimeInfoByOffset, hour24, isEmpty } from "../utils/common-utils";
import Mask = Image.Mask;
import EditTimeZone from "../edit-time-zone";

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
      icon={{
        source: `https://avatars.dicebear.com/api/initials/${timezone}.png`,
        mask: Mask.Circle,
        fallback: { light: "timezone.png", dark: "timezone@dark.png" },
      }}
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
          <ActionOpenCommandPreferences command={true} extension={true} />
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
  const keywords = timezone.toLowerCase().split("/");

  return (
    <List.Item
      id={JSON.stringify({ type: "star", region: timezone })}
      icon={{
        source: isEmpty(starTimezones[index].alias)
          ? `https://avatars.dicebear.com/api/initials/${timezone}.png`
          : `https://avatars.dicebear.com/api/initials/${encodeURI(starTimezones[index].alias + "")}.png`,
        mask: Mask.Circle,
        fallback: { light: "world-clock.png", dark: "world-clock@dark.png" },
      }}
      keywords={keywords}
      title={
        isEmpty(starTimezones[index].alias) ? timezone : { value: starTimezones[index].alias + "", tooltip: timezone }
      }
      accessories={[
        !isEmpty(starTimezones[index].memo)
          ? {
              icon: starTimezones[index].memoIcon,
              tooltip: starTimezones[index].memo,
            }
          : {},
        {
          text: starTimezones[index].date_time,
          tooltip: new Date(starTimezones[index].unixtime).toLocaleString("en-us", { hour12: !hour24 }),
        },
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
          <Action.Push
            icon={Icon.Pencil}
            title={"Edit Timezone"}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditTimeZone index={index} starTimezones={starTimezones} setRefresh={setRefresh} />}
          />
          <ActionOpenCommandPreferences command={true} extension={true} />
        </ActionPanel>
      }
    />
  );
}
