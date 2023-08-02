import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { runAppleScriptSilently } from "./utils";

const SESSIONS = [
  {
    id: 0,
    title: "Session 30 min of deep work mode and 5 min of break mode",
    subtitle: "",
    time: 30,
    break_time: 5,
    accessory: "Start",
  },
  {
    id: 1,
    title: "Session 1h of deep work and 10 min of break mode",
    subtitle: "",
    time: 60,
    break_time: 10,
    accessory: "Start",
  },

  {
    id: 2,
    title: "Session 1h30 of deep work and 15 min of break mode",
    subtitle: "",
    time: 90,
    break_time: 15,
    accessory: "Start",
  },
];

export default function Command() {
  return (
    <List>
      {SESSIONS.map((item) => (
        <List.Item
          key={item.id}
          icon="list-icon.png"
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ text: item.accessory, icon: Icon.Play }]}
          actions={
            <ActionPanel>
              <Action title="" onAction={() => action(item.time, item.break_time)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function action(time: number, break_time: number) {
  await runAppleScriptSilently(time, break_time);
}
