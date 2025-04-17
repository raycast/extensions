import * as fs from "node:fs";
import Paths from "./Paths";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import Reminder from "./Reminder";
import { formatRemainingTime, load } from "./timer";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  function refresh() {
    load().then((reminders) => {
      setReminders(reminders);
      setIsLoading(false);
    });
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(() => refresh(), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Section title={"Currently Running"}>
        {reminders.map((reminder) => (
          <List.Item
            key={reminder.id}
            title={reminder.message}
            subtitle={formatRemainingTime(reminder.targetTimestamp)}
            actions={
              <ActionPanel>
                <Action
                  title={"Remove Reminder"}
                  icon={Icon.Xmark}
                  onAction={() => {
                    removeReminder(reminder.id);
                    refresh();
                  }}
                />
              </ActionPanel>
            }
          ></List.Item>
        ))}
      </List.Section>
    </List>
  );
}

function removeReminder(id: string) {
  fs.unlinkSync(`${Paths.TIMER_PATH}/${id}`);
}
