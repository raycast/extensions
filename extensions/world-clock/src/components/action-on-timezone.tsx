import { Action, ActionPanel, getPreferenceValues, Icon } from "@raycast/api";
import { TimeInfo, Timezone } from "../types/types";
import { ActionToggleDetails } from "./action-toggle-details";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { ActionTimeInfo } from "./action-time-info";
import { Preferences } from "../types/preferences";
import { addTimeZones } from "../utils/common-utils";
import { MutatePromise } from "@raycast/utils";

export function ActionOnTimezone(props: {
  timeInfo: TimeInfo;
  starTimezones: Timezone[];
  timezone: string;
  mutate: () => Promise<void>;
  showDetail: boolean;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined> | undefined;
}) {
  const { timeInfo, starTimezones, timezone, mutate, showDetail, showDetailMutate } = props;
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
            await mutate();
          }}
        />
      )}
      {getPreferenceValues<Preferences>().itemLayout === "List" && (
        <ActionToggleDetails showDetail={showDetail} showDetailMutate={showDetailMutate} />
      )}
      <ActionOpenCommandPreferences command={true} extension={true} />
    </ActionPanel>
  );
}
