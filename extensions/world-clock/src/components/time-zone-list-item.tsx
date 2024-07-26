import { Image, List } from "@raycast/api";
import { TimeInfo, Timezone } from "../types/types";
import { TimeInfoDetail } from "./time-info-detail";
import {
  buildDayAndNightIcon,
  buildFullDateTime,
  buildIntervalTime,
  calculateTimeInfoByOffset,
  isEmpty,
} from "../utils/common-utils";
import { ActionOnTimezone } from "./action-on-timezone";
import { ActionOnStarredTimezone } from "./action-on-starred-timezone";
import { getAvatarIcon, MutatePromise } from "@raycast/utils";
import Mask = Image.Mask;

export function TimeZoneListItem(props: {
  index: number;
  timezone: string;
  timeInfo: TimeInfo;
  detailLoading: boolean;
  starTimezones: Timezone[];
  mutate: () => Promise<void>;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined>;
  showDetail: boolean;
}) {
  const { index, timezone, timeInfo, detailLoading, starTimezones, mutate, showDetailMutate, showDetail } = props;
  return (
    <List.Item
      id={JSON.stringify({ type: "all", index: index, region: timezone })}
      icon={getAvatarIcon(timezone.replace("/", " "))}
      title={timezone}
      accessories={[
        timezone === timeInfo.timezone
          ? {
              text: calculateTimeInfoByOffset(timeInfo.unixtime, timeInfo.utc_offset).time,
              tooltip: timeInfo.datetime + buildIntervalTime(timeInfo.datetime),
            }
          : {},
      ]}
      detail={<TimeInfoDetail timeInfo={timeInfo} detailLoading={detailLoading} />}
      actions={
        <ActionOnTimezone
          timeInfo={timeInfo}
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
  timezone: string;
  timeInfo: TimeInfo;
  detailLoading: boolean;
  starTimezones: Timezone[];
  mutate: () => Promise<void>;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined>;
  showDetail: boolean;
}) {
  const { index, timezone, timeInfo, detailLoading, starTimezones, mutate, showDetailMutate, showDetail } = props;
  const keywords = timezone.toLowerCase().split("/");

  return (
    <List.Item
      id={JSON.stringify({ type: "star", index: index, region: timezone })}
      icon={{
        source: {
          light: buildDayAndNightIcon(starTimezones[index].unixtime, true),
          dark: buildDayAndNightIcon(starTimezones[index].unixtime, false),
        },
      }}
      keywords={keywords}
      title={
        isEmpty(starTimezones[index].alias)
          ? timezone
          : {
              value: starTimezones[index].alias + "",
              tooltip: timezone,
            }
      }
      accessories={(starTimezones[index].avatar
        ? (starTimezones[index].avatar.map((value) => {
            return { icon: { source: value, mask: Mask.RoundedRectangle } };
          }) as [])
        : [{}]
      ).concat([
        !isEmpty(starTimezones[index].memo) && showDetail
          ? {
              icon: starTimezones[index].memoIcon,
              tooltip: starTimezones[index].memo,
            }
          : {},
        showDetail
          ? {
              text: starTimezones[index].date_time,
              tooltip:
                buildFullDateTime(new Date(starTimezones[index].unixtime)) +
                buildIntervalTime(starTimezones[index].unixtime),
            }
          : {
              text: starTimezones[index].date_time + buildIntervalTime(starTimezones[index].unixtime),
              tooltip:
                buildFullDateTime(new Date(starTimezones[index].unixtime)) +
                buildIntervalTime(starTimezones[index].unixtime),
            },
      ])}
      subtitle={
        !isEmpty(starTimezones[index].memo) && !showDetail
          ? {
              value: starTimezones[index].memo + "",
              tooltip: "Memo: " + starTimezones[index].memo,
            }
          : ""
      }
      detail={<TimeInfoDetail timezone={starTimezones[index]} timeInfo={timeInfo} detailLoading={detailLoading} />}
      actions={
        <ActionOnStarredTimezone
          timeInfo={timeInfo}
          index={index}
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
