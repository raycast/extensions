import { Color, Icon, showToast, Toast } from "@raycast/api";
import { differenceInDays, format, intlFormatDistance } from "date-fns";
import { BaseTrack, Service, ServiceError, Track, TrackCondition, TrackStatus } from "./types/common";

export function sortByName(trackA: BaseTrack, trackB: BaseTrack) {
  return trackA.name.localeCompare(trackB.name);
}

export function sortByMaintenance(trackA: Track, trackB: Track) {
  const maintenanceDateA = trackA.maintenanceDate?.valueOf() ?? 0;
  const maintenanceDateB = trackB.maintenanceDate?.valueOf() ?? 0;

  return maintenanceDateB - maintenanceDateA;
}

export async function showError({ title = "Failure", message }: ServiceError) {
  return showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
}

export function isValidDate(date: Date | null): boolean {
  if (!date || date.valueOf() === 0) {
    return false;
  }

  return true;
}

export function formatDate(date: Date | null): string {
  if (!date) {
    return "-";
  }
  return format(date, "EEE do MMM, H:mm");
}

export function formatMaintenanceDurationSince(track: Track): string {
  if (!track.maintenanceDate) {
    return "-";
  }
  return `${intlFormatDistance(track.maintenanceDate, new Date())} / ${format(track.maintenanceDate, "EEE")} ${format(
    track.maintenanceDate,
    "H:mm"
  )}`;
}

export function getTrackStatus({ track }: { track: Track }): TrackStatus {
  const status: TrackStatus = {
    color: Color.Red,
    text: "closed",
    icon: Icon.Warning,
  };

  if (track.status.toLocaleLowerCase() === "open") {
    status.color = Color.Green;
    status.text = "open";
    status.icon = Icon.CheckCircle;
  }

  return status;
}

export function getTrackCondition({ track }: { track: Track }): TrackCondition {
  // Defaults
  const condition: TrackCondition = {
    text: "",
    color: Color.PrimaryText,
    icon: Icon.QuestionMarkCircle,
  };

  // Value set
  if (isValidDate(track.maintenanceDate)) {
    condition.text = formatMaintenanceDurationSince(track);
    condition.color = Color.Green;
    condition.icon = Icon.CheckCircle;

    // No updates within 2 days
    if (differenceInDays(new Date(), track.maintenanceDate || 0) >= 2) {
      condition.color = Color.Yellow;
    }

    // No updates within 7 days
    if (differenceInDays(new Date(), track.maintenanceDate || 0) >= 7) {
      condition.color = Color.Red;
      condition.icon = Icon.QuestionMarkCircle;
    }
  }

  return condition;
}

export async function getServiceFromTrack(track: BaseTrack, services: Service[]) {
  const trackService = services.find((service) => service.id === track.serviceId);
  if (!trackService) {
    throw new Error("Failed to find service");
  }

  return trackService;
}
