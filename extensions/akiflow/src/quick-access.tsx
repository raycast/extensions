import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { openInAkiflow } from "../utils/akiflow";

interface Quicklink {
  title: string;
  icon: Icon;
}

// const quicklinks: Quicklink[] = ["Upcoming", "Daily Planning", "Weekly Planning", "Daily Shutdown", "Weekly Shutdown"];
const quicklinks: Quicklink[] = [
  { title: "Upcoming", icon: Icon.Calendar },
  { title: "Daily Planning", icon: Icon.Sunrise },
  { title: "Weekly Planning", icon: Icon.Sun },
  { title: "Daily Shutdown", icon: Icon.Moonrise },
  { title: "Weekly Shutdown", icon: Icon.Moon },
  { title: "Settings", icon: Icon.Gear },
  { title: "Statistics", icon: Icon.PieChart },
];

export default function QuickAccess() {
  return (
    <List>
      {quicklinks.map((quicklink) => (
        <List.Item
          key={quicklink.title}
          title={quicklink.title}
          subtitle={`Open The ${quicklink.title} Page In Akiflow`}
          icon={quicklink.icon}
          actions={
            <ActionPanel>
              <Action
                title={`Open ${quicklink.title} in Akiflow`}
                onAction={() => {
                  openInAkiflow(quicklink.title);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
