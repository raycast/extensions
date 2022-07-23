import { environment, getPreferenceValues, Image, List } from "@raycast/api";
import { TimeInfo, Timezone } from "../types/types";
import Mask = Image.Mask;
import { weeks } from "../utils/costants";
import { buildDayAndNightIcon, isEmpty } from "../utils/common-utils";
import fileUrl from "file-url";
import { Preferences } from "../types/preferences";

export function TimeInfoDetail(props: { timeInfo: TimeInfo; detailLoading: boolean; timezone?: Timezone }) {
  const { timezone, detailLoading, timeInfo } = props;
  const { showClock } = getPreferenceValues<Preferences>();
  return (
    <List.Item.Detail
      isLoading={detailLoading}
      markdown={
        !detailLoading && showClock
          ? `<img src="${fileUrl(
              `${environment.assetsPath}/${
                environment.theme === "light" ? "clock-icons" : "clock-icons@dark"
              }/${new Date(timeInfo.datetime).getHours()}.svg`
            )}" alt="${timeInfo.timezone}" height="190" />`
          : undefined
      }
      metadata={
        typeof timeInfo.datetime !== "undefined" &&
        !detailLoading && (
          <List.Item.Detail.Metadata>
            {!isEmpty(timezone?.memo) && (
              <>
                <List.Item.Detail.Metadata.Label title="Memo" icon={timezone?.memoIcon} text={timezone?.memo} />
                <List.Item.Detail.Metadata.Separator />
              </>
            )}
            <List.Item.Detail.Metadata.Label
              title="Timezone"
              icon={{
                source: `https://avatars.dicebear.com/api/initials/${timeInfo.timezone}.png`,
                mask: Mask.Circle,
                fallback: "world-clock.png",
              }}
              text={timeInfo.timezone}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              icon={
                !showClock
                  ? {
                      source: {
                        light: buildDayAndNightIcon(timeInfo.datetime, true),
                        dark: buildDayAndNightIcon(timeInfo.datetime, false),
                      },
                    }
                  : undefined
              }
              title="Date Time"
              text={timeInfo.datetime}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="UTC Time" text={timeInfo.utc_datetime} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="UTC Offset" text={timeInfo.utc_offset} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Day of Week" text={weeks[timeInfo.day_of_week]} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Day of Year" text={timeInfo.day_of_year + ""} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Week Number" text={timeInfo.week_number + ""} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Abbreviation" text={timeInfo.abbreviation} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Client IP" text={timeInfo.client_ip} />
            <List.Item.Detail.Metadata.Separator />
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
}
