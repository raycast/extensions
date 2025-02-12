import { Grid } from "@raycast/api";
import { CurrentTime, Timezone } from "../types/types";
import { buildFullDateTime, buildIntervalTime, formatMenubarDate, getGridAvatar, isEmpty } from "../utils/common-utils";
import { ActionOnTimezone } from "./action-on-timezone";
import { ActionOnStarredTimezone } from "./action-on-starred-timezone";

export function TimeZoneGridItem(props: {
  index: number;
  timezone: string;
  currentTime: CurrentTime | undefined;
  starTimezones: Timezone[];
  mutate: () => Promise<void>;
}) {
  const { index, timezone, currentTime, starTimezones, mutate } = props;
  return (
    <Grid.Item
      id={JSON.stringify({ type: "all", index: index, region: timezone })}
      content={
        currentTime && currentTime.timeZone === timezone
          ? {
              value: {
                source: {
                  light: `clock-icons/${new Date(currentTime.dateTime).getHours()}.svg`,
                  dark: `clock-icons@dark/${new Date(currentTime.dateTime).getHours()}.svg`,
                },
              },
              tooltip: formatMenubarDate(new Date(currentTime.dateTime)) + buildIntervalTime(currentTime.dateTime),
            }
          : {
              source: {
                light: "timezone-icon.svg",
                dark: "timezone-icon@dark.svg",
              },
            }
      }
      subtitle={currentTime?.timeZone === timezone ? formatMenubarDate(new Date(currentTime.dateTime)) : undefined}
      title={timezone}
      actions={
        <ActionOnTimezone
          currentTime={currentTime}
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
  timezone: Timezone;
  currentTime: CurrentTime | undefined;
  starTimezones: Timezone[];
  mutate: () => Promise<void>;
}) {
  const { index, timezone, currentTime, starTimezones, mutate } = props;
  const keywords = timezone.timezone.toLowerCase().split("/");
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
      title={isEmpty(starTimezones[index].alias) ? timezone.timezone : starTimezones[index].alias + ""}
      subtitle={starTimezones[index].date_time + buildIntervalTime(starTimezones[index].unixtime)}
      accessory={{
        icon: getGridAvatar(starTimezones[index]),
        tooltip: `${isEmpty(starTimezones[index].alias) ? "" : `${starTimezones[index].alias}\n`}
${starTimezones[index].memo}`,
      }}
      actions={
        <ActionOnStarredTimezone
          index={index}
          currentTime={currentTime}
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
