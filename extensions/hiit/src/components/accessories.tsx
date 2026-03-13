import { Icon } from "@raycast/api";
import { Item } from "../types";
import { secondsToTime } from "../utils";

export function accessories(item: Item) {
  const accessories = [
    { text: `${item.interval.high} / ${item.interval.low}`, icon: Icon.Crown, tooltip: "Intervals" },
    { text: `${item.interval.intervals}`, icon: Icon.ArrowLeftCircle, tooltip: "Total Intervals" },
  ];

  if (item.interval.warmup) {
    accessories.push({
      text: `${secondsToTime(item.interval.warmup)}`,
      icon: Icon.ArrowUpCircle,
      tooltip: "Warmup",
    });
  }

  if (item.interval.cooldown) {
    accessories.push({
      text: `${secondsToTime(item.interval.cooldown)}`,
      icon: Icon.ArrowDownCircle,
      tooltip: "Cooldown",
    });
  }

  return [
    ...accessories,
    {
      text: `${secondsToTime(item.interval.totalTime)}`,
      icon: Icon.Clock,
      tooltip: "Total Time",
    },
  ];
}
