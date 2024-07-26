import { Action, ActionPanel, getPreferenceValues, Icon } from "@raycast/api";
import { TimeInfo, Timezone } from "../types/types";
import { Dispatch, SetStateAction } from "react";
import { ActionToggleDetails } from "./action-toggle-details";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { ActionTimeInfo } from "./action-time-info";
import { Preferences } from "../types/preferences";
import { addTimeZones } from "../utils/common-utils";

export function ActionOnTimezone(props: {
  timeInfo: TimeInfo;
  starTimezones: Timezone[];
  timezone: string;
  setRefresh: Dispatch<SetStateAction<number>>;
  showDetail: boolean;
  setRefreshDetail: Dispatch<SetStateAction<number>>;
}) {
  const { timeInfo, starTimezones, timezone, setRefresh, showDetail, setRefreshDetail } = props;
  return (
    <ActionPanel>
      {timeInfo !== ({} as TimeInfo) && timeInfo.timezone === timezone && <ActionTimeInfo timeInfo={timeInfo} />}
      {timeInfo !== ({} as TimeInfo) && timeInfo.timezone === timezone && (
        <Action
          icon={Icon.Star}
          title={"Star Timezone"}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={async () => {
            await addTimeZones(starTimezones, {
              timezone: timezone,
              utc_offset: timeInfo.utc_offset,
              date_time: "",
              unixtime: 0,
            });
            setRefresh(Date.now());
          }}
        />
      )}
      {getPreferenceValues<Preferences>().itemLayout === "List" && (
        <ActionToggleDetails showDetail={showDetail} setRefresh={setRefreshDetail} />
      )}
      <ActionOpenCommandPreferences command={true} extension={true} />
    </ActionPanel>
  );
}
