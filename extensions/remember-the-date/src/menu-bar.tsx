import { MenuBarExtra, launchCommand, LaunchType, Icon, getPreferenceValues } from "@raycast/api";
import moment from "moment";
import { useMemo } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getFormattedList } from "./list";
import { getEffectiveDate } from "./utils";

export default function Command() {
  const { data: datesList, isLoading } = useCachedPromise(getFormattedList, []);
  const preferences = getPreferenceValues<Preferences>();
  const { showCountdownByDay } = preferences;

  const { nextDate, untilNextDate, itemUntilMap } = useMemo(() => {
    if (!datesList?.length) return { nextDate: null, untilNextDate: "", itemUntilMap: new Map<string, string>() };
    const upcomingDates = datesList[0].items;
    const next = upcomingDates[0];
    if (!next) return { nextDate: null, untilNextDate: "", itemUntilMap: new Map<string, string>() };

    const today = moment().startOf("day");
    const nextEffective = getEffectiveDate(next);
    const difference = showCountdownByDay
      ? "in " + nextEffective.diff(today, "days") + " days"
      : nextEffective.fromNow();
    const untilNext = `${next.name.length > 15 ? next.name.substring(0, 15) + "..." : next.name} ${difference}`;

    const map = new Map<string, string>();
    for (const item of upcomingDates) {
      const itemEffective = getEffectiveDate(item);
      const until = showCountdownByDay ? itemEffective.diff(today, "days") + " days" : itemEffective.fromNow();
      map.set(item.id, until);
    }
    return { nextDate: next, untilNextDate: untilNext, itemUntilMap: map };
  }, [datesList, showCountdownByDay]);

  if (!datesList) {
    return <MenuBarExtra isLoading={isLoading} />;
  }

  const upcomingDates = datesList[0].items;

  if (!nextDate) {
    return null;
  }

  return (
    <MenuBarExtra icon={nextDate.icon} title={untilNextDate}>
      <MenuBarExtra.Section>
        {upcomingDates.map((item) => (
          <MenuBarExtra.Item
            key={item.id}
            icon={{ source: item.icon, tintColor: item.color }}
            title={item.name}
            subtitle={itemUntilMap.get(item.id) ?? ""}
            onAction={async () => {
              try {
                await launchCommand({ name: "list", type: LaunchType.UserInitiated });
              } catch (error) {
                await showFailureToast(error, { title: "Failed to launch command" });
              }
            }}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Create Date"
          icon={Icon.PlusCircle}
          onAction={async () => {
            try {
              await launchCommand({ name: "index", type: LaunchType.UserInitiated });
            } catch (error) {
              await showFailureToast(error, { title: "Failed to launch command" });
            }
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
