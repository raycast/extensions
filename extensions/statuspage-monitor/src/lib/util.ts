import { Color, Icon, Image } from "@raycast/api";
import { Component, ComponentGroup, ComponentStatus, IncidentStatus, Indicator } from "./types";

export const capitalizeFirstLetter = (s: string) =>
  s
    .split(/[\s_-]/g)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const formatDate = (date: Date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const hour = date.getHours() % 12 || 12;
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const timeOfDay = date.getHours() <= 12 ? "AM" : "PM";

  return `${month} ${day}, ${hour}:${minutes} ${timeOfDay}`;
};

export function iconForIndicator(status: Indicator | IncidentStatus | ComponentStatus): Image {
  switch (status) {
    case "none":
    case "resolved":
    case "operational":
      return { source: Icon.Checkmark, tintColor: Color.Green }; // green

    case "minor":
    case "monitoring":
    case "degraded_performance":
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow }; // yellow

    case "major":
    case "partial_outage":
    case "investigating":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange }; // orange

    case "identified":
    case "major_outage":
    case "critical":
      return { source: Icon.ExclamationMark, tintColor: Color.Red }; // red

    case "maintenance":
    case "under_maintenance":
      return { source: Icon.Hammer, tintColor: Color.Blue }; // blue

    case "postmortem":
    default:
      return { source: Icon.Checkmark, tintColor: Color.Blue }; // blue
  }
}

export function groupComponents(components: Component[]): (ComponentGroup | Component)[] {
  const componentGroups = components.filter((c) => c.group && c.components);
  const notGroups = components.filter((c) => !c.group);
  const notInGroups = notGroups.filter((c) => !c.group_id);

  const grouped = componentGroups.map((cg) => ({
    ...cg,
    components: (cg.components as string[]).map((c) => components.find((d) => d.id === c)),
  }));
  return [...notInGroups, ...grouped] as (ComponentGroup | Component)[];
}

export function parseUrl(string: string) {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  return url;
}
