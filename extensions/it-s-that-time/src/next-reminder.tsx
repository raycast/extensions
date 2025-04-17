import { Icon, MenuBarExtra } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatRemainingTime, load } from "./timer";
import Reminder from "./Reminder";

export default function Command() {
  const [nextReminder, setNextReminder] = useState<Reminder | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  async function refresh() {
    const reminders = await load();
    setNextReminder(findNextReminder(reminders));
  }

  useEffect(() => {
    refresh().then(() => setIsLoading(false));
  }, []);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={nextReminder ? `remaining ${formatRemainingTime(nextReminder.targetTimestamp)}` : ""}
      icon={nextReminder ? "" : Icon.Alarm}
    >
      {nextReminder && (
        <MenuBarExtra.Item title={`~ ${nextReminder ? formatDateTime(nextReminder.targetTimestamp) : ""}`} />
      )}
      {nextReminder && <MenuBarExtra.Item title={nextReminder?.message ?? ""} onAction={() => {}} />}
    </MenuBarExtra>
  );
}

function findNextReminder(reminders: Reminder[]): Reminder | undefined {
  if (reminders.length === 0) {
    return undefined;
  }
  return reminders.slice().sort((a, b) => a.targetTimestamp - b.targetTimestamp)[0];
}

function formatDateTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.toDateString()} ${date.toLocaleTimeString()}`;
}
