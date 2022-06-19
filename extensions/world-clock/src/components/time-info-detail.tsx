import { Image, List } from "@raycast/api";
import React from "react";
import { TimeInfo, Timezone } from "../types/types";
import Mask = Image.Mask;
import { weeks } from "../utils/costants";
import { isEmpty } from "../utils/common-utils";

export function TimeInfoDetail(props: { timeInfo: TimeInfo; detailLoading: boolean; timezone?: Timezone }) {
  const { timezone, detailLoading, timeInfo } = props;
  return (
    <List.Item.Detail
      isLoading={detailLoading}
      metadata={
        typeof timeInfo.datetime !== "undefined" &&
        !detailLoading && (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Timezone"
              icon={{
                source: `https://avatars.dicebear.com/api/initials/${timeInfo.timezone}.png`,
                mask: Mask.Circle,
                fallback: { light: "world-clock.png", dark: "world-clock@dark.png" },
              }}
              text={timeInfo.timezone}
            />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Date Time" text={timeInfo.datetime} />
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

            {!isEmpty(timezone?.memo) && (
              <>
                <List.Item.Detail.Metadata.Label title="Memo" icon={timezone?.memoIcon} text={timezone?.memo} />
                <List.Item.Detail.Metadata.Separator />
              </>
            )}
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
}
