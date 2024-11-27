import { Grid } from "@raycast/api";
import { TimeInfo, Timezone } from "../types/types";
import {
  buildFullDateTime,
  buildIntervalTime,
  calculateDateTimeByOffset,
  getGridAvatar,
  isEmpty,
} from "../utils/common-utils";
import { ActionOnTimezone } from "./action-on-timezone";
import { ActionOnStarredTimezone } from "./action-on-starred-timezone";

export function TimeZoneGridItem(props: {
  index: number;
  timezone: string;
  timeInfo: TimeInfo;
  starTimezones: Timezone[];
  mutate: () => Promise<void>;
}) {
  const { index, timezone, timeInfo, starTimezones, mutate } = props;
  return (
    <Grid.Item
      id={JSON.stringify({ type: "all", index: index, region: timezone })}
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
      subtitle={
        timeInfo.timezone === timezone
          ? calculateDateTimeByOffset(timeInfo.utc_offset).date_time + buildIntervalTime(timeInfo.datetime)
          : undefined
      }
      title={timezone}
      actions={
        <ActionOnTimezone
          timeInfo={timeInfo}
          starTimezones={starTimezones}
          timezone={timezone}
          mutate={mutate}
          showDetail={false}
          showDetailMutate={undefined}
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
  mutate: () => Promise<void>;
}) {
  const { index, timezone, timeInfo, starTimezones, mutate } = props;
  const keywords = timezone.toLowerCase().split("/");
  return (
    <Grid.Item
      id={JSON.stringify({ type: "star", index: index, region: timezone })}
      content={{
        value: {
          source: {
            light: `clock-icons/${new Date(starTimezones[index].unixtime).getHours()}.svg`,
            dark: `clock-icons@dark/${new Date(starTimezones[index].unixtime).getHours()}.svg`,
          },
        },
        tooltip: `${starTimezones[index].timezone}${isEmpty(starTimezones[index].alias) ? "" : `\n${starTimezones[index].alias}`}
${buildFullDateTime(new Date(starTimezones[index].unixtime))}${buildIntervalTime(starTimezones[index].unixtime)}`,
      }}
      keywords={keywords}
      title={isEmpty(starTimezones[index].alias) ? timezone : starTimezones[index].alias + ""}
      subtitle={starTimezones[index].date_time + buildIntervalTime(starTimezones[index].unixtime)}
      accessory={{
        icon: getGridAvatar(starTimezones[index]),
        tooltip: `${isEmpty(starTimezones[index].alias) ? "" : `${starTimezones[index].alias}\n`}
${starTimezones[index].memo}`,
      }}
      actions={
        <ActionOnStarredTimezone
          timeInfo={timeInfo}
          index={index}
          starTimezones={starTimezones}
          timezone={timezone}
          mutate={mutate}
          showDetail={false}
          showDetailMutate={undefined}
        />
      }
    />
  );
}
