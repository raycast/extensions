import { Booking } from "./types";
import { Alert, confirmAlert, Icon, Image, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { deleteBooking } from "../api/deskly";
import { relativeDay, renderTimeRange } from "./format";

export function renderBookingDate(booking: Booking): string {
  if (booking === null) {
    return "-";
  }

  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const bookingDate = relativeDay(booking.date) ?? weekday[booking.date.getDay()];

  const range = renderTimeRange(booking.from, booking.until);
  return range ? `${bookingDate} (${range})` : bookingDate;
}

/** Turns an in-progress toast into a failure toast with a consistently-normalized error message. */
export function failToast(toast: Toast, title: string, error: unknown): void {
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = error instanceof Error ? error.message : String(error);
}

export function profileIcon(profileImage: string | undefined | null, apiUrl: string): Icon | Image.ImageLike {
  if (profileImage) {
    const src = profileImage.startsWith("http") ? profileImage : apiUrl + profileImage;
    return { source: src, mask: Image.Mask.Circle };
  }
  return Icon.Person;
}

export async function confirmDeleteBooking(booking: Booking, onDeleted: () => void): Promise<void> {
  const dateStr = booking.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const confirmed = await confirmAlert({
    title: "Delete Booking",
    message: `Delete your booking for ${renderSeatName(booking)} on ${dateStr}?`,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;

  const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting booking…" });
  try {
    await deleteBooking(booking.id);
    toast.style = Toast.Style.Success;
    toast.title = "Booking deleted";
    onDeleted();
    await launchCommand({ name: "todays-booking", type: LaunchType.Background });
  } catch (error) {
    failToast(toast, "Failed to delete booking", error);
  }
}

export function renderSeatName(booking: Booking): string {
  if (booking.seat?.name) {
    return booking.seat?.name;
  } else if (booking.seatBooked?.name) {
    return booking.seatBooked?.name;
  } else if (booking.multipleBookings) {
    return "Multiple bookings";
  } else {
    return "No seat booked";
  }
}
