import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { CurrentTime, Timezone } from "../types/types";
import { ActionToggleDetails } from "./action-toggle-details";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { ActionTimeInfo } from "./action-time-info";
import { itemLayout } from "../types/preferences";
import { addTimeZones, getTimeZoneInfo } from "../utils/common-utils";
import { MutatePromise } from "@raycast/utils";
import { TIME_SECOND_TO_HOUR } from "../utils/costants";

export function ActionOnTimezone(props: {
  currentTime: CurrentTime | undefined;
  starTimezones: Timezone[];
  timezone: string;
  mutate: () => Promise<void>;
  showDetail: boolean;
  showDetailMutate: MutatePromise<boolean | undefined, boolean | undefined> | undefined;
}) {
  const { currentTime, starTimezones, timezone, mutate, showDetail, showDetailMutate } = props;
  return (
    <ActionPanel>
      {currentTime && currentTime.timeZone === timezone && <ActionTimeInfo currentTime={currentTime} />}
      {currentTime && currentTime.timeZone === timezone && (
        <Action
          icon={Icon.Star}
          title={"Star Timezone"}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={async () => {
            const timezoneInfo = await getTimeZoneInfo(timezone);
            if (timezoneInfo) {
              await addTimeZones(starTimezones, {
                timezone: timezone,
                utc_offset: String(timezoneInfo.currentUtcOffset.seconds / TIME_SECOND_TO_HOUR),
                date_time: "",
                unixtime: 0,
              });
            } else {
              await showToast(Toast.Style.Failure, "Error", "Failed to get timezone information");
            }
            await mutate();
          }}
        />
      )}
      {itemLayout === "List" && <ActionToggleDetails showDetail={showDetail} showDetailMutate={showDetailMutate} />}
      <ActionOpenCommandPreferences command={true} extension={true} />
    </ActionPanel>
  );
}
