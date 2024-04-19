import { MenuBarExtra, launchCommand, LaunchType, Icon } from "@raycast/api";
import moment from "moment";
import { useCachedPromise } from "@raycast/utils";
import { getShortcut } from "./utils";
import { getFormattedList } from "./list";

export default function Command() {
  const { data: connectionsList, isLoading } = useCachedPromise(getFormattedList, []);

  if (!connectionsList) {
    return <MenuBarExtra isLoading={isLoading} />;
  }

  const upcomingDates = connectionsList[0].items;
  const nextDate = upcomingDates[0];

  if (!nextDate) {
    return null;
  }

  const untilNextDate = `${nextDate.name.length > 15 ? nextDate.name.substring(0, 15) + "..." : nextDate.name} ${moment(
    nextDate.date,
  ).fromNow()}`;

  return (
    <MenuBarExtra icon={nextDate.icon} title={untilNextDate}>
      <MenuBarExtra.Section>
        {upcomingDates.map((item, index) => {
          const until = moment(item.date).fromNow();
          return (
            <MenuBarExtra.Item
              key={item.name}
              icon={{ source: item.icon, tintColor: item.color }}
              title={item.name}
              subtitle={until}
              onAction={() => launchCommand({ name: "list", type: LaunchType.UserInitiated })}
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Create Date"
          icon={Icon.PlusCircle}
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
