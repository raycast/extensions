import {
  Clipboard,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { prefix, suffix, weekNumberText } from "./types/preferences";
import { getWeekNumber, getWeekNumberIcon } from "./utils/common-utils";

export default function WeekNumber() {
  return (
    <MenuBarExtra
      isLoading={false}
      title={prefix + (weekNumberText ? getWeekNumber() : "") + suffix}
      icon={getWeekNumberIcon()}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Clipboard}
          title={"Copy Week Number"}
          onAction={async () => {
            const weekNum = getWeekNumber();
            await Clipboard.copy(weekNum);
            await showHUD(`🗓️ Week number ${weekNum} copied`);
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Calendar}
          title={"Find Week Number"}
          onAction={async () => {
            await launchCommand({ name: "find-week-number", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Gear}
          title={"Settings..."}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => {
            openCommandPreferences().then();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
