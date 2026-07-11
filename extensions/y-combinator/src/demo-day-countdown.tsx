import { getPreferenceValues, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { differenceInCalendarDays } from "date-fns";

export default function Command() {
  const preferences = getPreferenceValues();
  const demoDay = new Date(preferences.demoDay);
  const countdown = differenceInCalendarDays(demoDay, new Date());
  return countdown > 0 ? (
    <MenuBarExtra icon="icon.png" title={`${countdown} days`}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Bookface"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open("https://bookface.ycombinator.com")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Demo Day"
          subtitle={demoDay.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          onAction={() => open("https://www.ycombinator.com/demoday")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  ) : null;
}
