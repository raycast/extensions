import { MenuBarExtra, launchCommand, LaunchType, Icon } from "@raycast/api";
import moment from "moment";
import { useCachedPromise } from "@raycast/utils";
import { getFormattedList } from "./list";

export default function Command() {
  const { data: datesList, isLoading } = useCachedPromise(getFormattedList, []);

  if (!datesList) {
    return <MenuBarExtra isLoading={isLoading} />;
  }

  const upcomingDates = datesList[0].items;
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
        {upcomingDates.map((item) => {
          const until = moment(item.date).fromNow();
          return (
            <MenuBarExtra.Item
              key={item.name}
              icon={{ source: item.icon, tintColor: item.color }}
              title={item.name}
              subtitle={until}
              onAction={async () => {
                try {
                  await launchCommand({ name: "list", type: LaunchType.UserInitiated });
                } catch (error) {
                  console.error("Failed to launch command:", error);
                }
              }}
            />
          );
        })}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Create Date"
          icon={Icon.PlusCircle}
          onAction={async () => {
            try {
              await launchCommand({ name: "index", type: LaunchType.UserInitiated });
            } catch (error) {
              console.error("Failed to launch command:", error);
            }
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
