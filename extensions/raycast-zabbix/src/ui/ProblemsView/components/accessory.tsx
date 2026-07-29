import * as Types from "@ui/types";
import { Color, Icon, List } from "@raycast/api";
import { GetProblemDuration } from "@ui/components/accessory";

/* Accessory Tag Severity */
const AccessorySeverity: Record<number, List.Item.Accessory> = {
  0: {
    tag: {
      value: "Not Classified",
      color: { light: "#97AAB3", dark: "#97AAB3" },
    },
    icon: Icon.Info,
    tooltip: "Not Classified",
  },
  1: {
    tag: {
      value: "Info",
      color: { light: "#7499FF", dark: "#7499FF" },
    },
    icon: Icon.Info,
    tooltip: "Information",
  },
  2: {
    tag: { value: "Warn", color: { light: "#FFC859", dark: "#FFC859" } },
    icon: Icon.Warning,
    tooltip: "Warning",
  },
  3: {
    tag: { value: "Avg", color: { light: "#FFA059", dark: "#FFA059" } },
    icon: Icon.Warning,
    tooltip: "Average",
  },
  4: {
    tag: { value: "High", color: { light: "#E9765A", dark: "#E9765A" } },
    icon: Icon.XMarkCircle,
    tooltip: "High",
  },
  5: {
    tag: { value: "Dstr", color: { light: "#E45959", dark: "#E45959" } },
    icon: Icon.XMarkCircle,
    tooltip: "Disaster",
  },
};

/* Accessory */
export function ItemAccessory(
  item: Types.DataProblemsView,
  selectedZabbixServer?: string,
): List.Item.Accessory[] {
  const accessory: List.Item.Accessory[] = [];

  /* Zabbix Server Name*/
  if (selectedZabbixServer && selectedZabbixServer.toLowerCase() === "all")
    accessory.push({ icon: Icon.Building, tag: item.server_name });

  /* Acknowledged */
  if (item.lastEvent?.acknowledged && item.lastEvent.acknowledged === "1")
    accessory.push({
      tag: { value: "", color: Color.Green },
      icon: Icon.ThumbsUp,
      tooltip: "Acknowledged",
    });

  /* Messages */
  if (item.event_get_result?.acknowledges?.length) {
    const messages = item.event_get_result?.acknowledges?.filter(
      (v) => v.message && v.message !== "",
    );
    if (messages)
      accessory.push({
        tag: { value: String(messages.length), color: Color.PrimaryText },
        icon: Icon.SpeechBubble,
        tooltip: "Messages",
      });
  }

  /* Severity */
  if (item.lastEvent?.severity)
    accessory.push(AccessorySeverity[item.lastEvent.severity]);

  /* Duration */
  if (item.lastEvent?.clock) {
    /* Get Trigger Formatted Date */
    const date = new Date(item.lastEvent.clock * 1000);
    const currentDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const currentTime = date.toLocaleTimeString("en-US");

    accessory.push({
      tag: {
        value: GetProblemDuration(item.lastEvent.clock),
        color: Color.Purple,
      },
      icon: Icon.Hourglass,
      tooltip: `${currentDate} ${currentTime}`,
    });
  }

  /* Action */
  return accessory;
}
