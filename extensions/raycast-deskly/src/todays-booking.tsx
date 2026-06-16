import { launchCommand, LaunchProps, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { fetchBookings } from "./api/deskly";
import { renderSeatName } from "./lib/utils";
import { isSameDay } from "./lib/format";

export default async function Command(props: LaunchProps) {
  const today = new Date(Date.now());

  let bookings;
  try {
    bookings = await fetchBookings(today.getFullYear(), today.getMonth() + 1);
  } catch (error) {
    await updateCommandMetadata({ subtitle: "Authentication error – update refresh token" });
    await showToast({
      style: Toast.Style.Failure,
      title: "Authentication Failed",
      message: error instanceof Error ? error.message : "Please update your refresh token in preferences.",
    });
    return;
  }

  const todayBookings = bookings.filter((booking) => isSameDay(booking.date, today));

  if (todayBookings.length > 1) {
    await updateCommandMetadata({ subtitle: "Multiple bookings for this day" });
  } else if (todayBookings.length === 1) {
    const seat = todayBookings[0].seat ?? todayBookings[0].seatBooked;
    const details = [seat?.floorName, seat?.roomName].filter(Boolean).join(" · ");
    await updateCommandMetadata({ subtitle: `${renderSeatName(todayBookings[0])}${details ? ` - ${details}` : ""}` });
  } else {
    await updateCommandMetadata({ subtitle: "No booking today" });
  }

  if (props.launchType === LaunchType.Background) return;

  if (todayBookings.length === 0) {
    await launchCommand({
      name: "book-a-seat",
      type: LaunchType.UserInitiated,
      context: { defaultDate: today.toISOString() },
    });
  } else {
    await launchCommand({ name: "my-bookings", type: LaunchType.UserInitiated, context: { openTodayBooking: true } });
  }
}
