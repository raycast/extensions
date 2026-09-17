import * as Types from "@ui/types";
import { Color, Icon, List } from "@raycast/api";
import {
  GetAccessorySeverity,
  GetProblemDuration,
} from "@ui/components/accessory";

export function ItemAccessory(
  item: Types.DataItemsView,
  showHost = false,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  /* Problems */
  if (item.triggers) {
    const problems: number[] = [0, 0, 0, 0, 0, 0];

    /* Count Problems by Severity */
    for (const trigger of item.triggers) {
      if (!trigger.status || !trigger.value || !trigger.priority) continue;

      /* Count only if Trigger is enabled and in Problem status */
      if (trigger.status === "0" && trigger.value === "1")
        problems[Number(trigger.priority)] += 1;
    }

    /* Push Accessory */
    for (const [severity, counter] of problems.entries()) {
      if (counter === 0) continue;
      const a = GetAccessorySeverity(severity, String(counter));
      if (a) accessories.push(a);
    }
  }

  /* Duration */
  if (item.lastclock) {
    /* Get Trigger Formatted Date */
    const date = new Date(Number(item.lastclock) * 1000);
    const currentDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const currentTime = date.toLocaleTimeString("en-US");

    accessories.push({
      tag: {
        value: GetProblemDuration(Number(item.lastclock)),
        color: item.error && item.error !== "" ? Color.Red : Color.Purple,
      },
      icon: Icon.Hourglass,
      tooltip:
        item.error && item.error !== ""
          ? item.error
          : `${currentDate} ${currentTime}`,
    });
  }

  /* Host */
  const host = item.hosts?.at(0);
  if (showHost && host)
    accessories.push({
      tag: { value: host.name, color: Color.PrimaryText },
      icon: Icon.HardDrive,
    });

  return accessories;
}
