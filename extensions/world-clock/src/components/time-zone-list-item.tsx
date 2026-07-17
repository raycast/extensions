import { Image, List } from "@raycast/api";
import { CurrentTime, Timezone } from "../types/types";
import { TimeInfoDetail } from "./time-info-detail";
import {
  buildDayAndNightIcon,
  buildFullDateTime,
  buildIntervalTime,
  formatMenubarDate,
  isEmpty,
} from "../utils/common-utils";
import { ActionOnTimezone } from "./action-on-timezone";
import { getAvatarIcon, MutatePromise } from "@raycast/utils";
import { ActionOnStarredTimezone } from "./action-on-starred-timezone";
import Mask = Image.Mask;

export function TimeZoneListItem(props: {
  index: number;
  timezone: string;
  currentTime: CurrentTime;
  detailLoading: boolean;
  starTimezones: Timezone[];
  mutate: () => Promise<void>;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined>;
  showDetail: boolean;
}) {
  const { index, timezone, currentTime, detailLoading, starTimezones, mutate, showDetailMutate, showDetail } = props;
  return (
    <List.Item
      id={JSON.stringify({ type: "all", index: index, region: timezone })}
      icon={getAvatarIcon(timezone.replace("/", " "))}
      title={timezone}
      accessories={[
        timezone === currentTime.timeZone
          ? {
              text: currentTime.time,
              tooltip: formatMenubarDate(new Date(currentTime.dateTime)) + buildIntervalTime(currentTime.dateTime),
            }
          : {},
      ]}
      detail={<TimeInfoDetail currentTime={currentTime} detailLoading={detailLoading} />}
      actions={
        <ActionOnTimezone
          currentTime={currentTime}
          starTimezones={starTimezones}
          timezone={timezone}
          mutate={mutate}
          showDetail={showDetail}
          showDetailMutate={showDetailMutate}
        />
      }
    />
  );
}

export function StarredTimeZoneListItem(props: {
  index: number;
  currentTime: CurrentTime;
  timezone: Timezone;
  detailLoading: boolean;
  starTimezones: Timezone[];
  mutate: () => Promise<void>;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined>;
  showDetail: boolean;
}) {
  const { index, currentTime, timezone, detailLoading, starTimezones, mutate, showDetailMutate, showDetail } = props;
  const keywords = timezone.timezone.toLowerCase().split("/");
  const starTimezone = starTimezones[index];

  return (
    <List.Item
      id={JSON.stringify({ type: "star", index: index, region: timezone.timezone })}
      icon={{
        source: {
          light: buildDayAndNightIcon(starTimezone.unixtime, true),
          dark: buildDayAndNightIcon(starTimezone.unixtime, false),
        },
      }}
      keywords={keywords}
      title={
        isEmpty(starTimezone.alias)
          ? timezone.timezone
          : {
              value: String(starTimezone.alias),
              tooltip: String(timezone.timezone),
            }
      }
      accessories={(starTimezone.avatar
        ? (starTimezone.avatar.map((value) => {
            return { icon: { source: value, mask: Mask.RoundedRectangle } };
          }) as [])
        : [{}]
      ).concat([
        !isEmpty(starTimezone.memo) && showDetail
          ? {
              icon: starTimezone.memoIcon,
              tooltip: starTimezone.memo,
            }
          : {},
        showDetail
          ? {
              text: starTimezone.date_time,
              tooltip: buildFullDateTime(new Date(starTimezone.unixtime)) + buildIntervalTime(starTimezone.unixtime),
            }
          : {
              text: starTimezone.date_time + buildIntervalTime(starTimezone.unixtime),
              tooltip: buildFullDateTime(new Date(starTimezone.unixtime)) + buildIntervalTime(starTimezone.unixtime),
            },
      ])}
      subtitle={
        !isEmpty(starTimezone.memo) && !showDetail
          ? {
              value: starTimezone.memo + "",
              tooltip: "Memo: " + starTimezone.memo,
            }
          : undefined
      }
      detail={
        <TimeInfoDetail timezone={starTimezones[index]} currentTime={currentTime} detailLoading={detailLoading} />
      }
      actions={
        <ActionOnStarredTimezone
          index={index}
          currentTime={currentTime}
          starTimezones={starTimezones}
          timezone={timezone}
          mutate={mutate}
          showDetail={showDetail}
          showDetailMutate={showDetailMutate}
        />
      }
    />
  );
}
