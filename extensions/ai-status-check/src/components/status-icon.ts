import { Color, Icon, type Image } from "@raycast/api";
import type { DataFreshness, Health, Incident } from "../domain/types";

export function statusIcon(health: Health, freshness: DataFreshness = "fresh"): Image.ImageLike {
  if (freshness === "expired" || freshness === "unavailable") {
    return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
  }

  switch (health) {
    case "operational":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "degraded":
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    case "partial_outage":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "major_outage":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "maintenance":
      return { source: Icon.Clock, tintColor: Color.Blue };
    case "unknown":
      return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
  }
}

export function incidentIcon(incident: Incident): Image.ImageLike {
  if (incident.state === "resolved") return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (incident.state === "scheduled") return { source: Icon.Clock, tintColor: Color.Blue };
  if (incident.health === "operational" || incident.health === "unknown" || incident.health === "maintenance") {
    return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
  }
  return statusIcon(incident.health);
}
