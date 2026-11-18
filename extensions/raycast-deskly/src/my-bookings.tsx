import {
  getPreferenceValues,
  Icon,
  LaunchProps,
  LaunchType,
  List,
  popToRoot,
  updateCommandMetadata,
  useNavigation,
} from "@raycast/api";
import { usePromise, useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import BookingDetail from "./components/BookingDetail";
import DesklyEmptyView from "./components/DesklyEmptyView";
import OfficeList, { buildSections } from "./components/OfficeList";
import { fetchBookings, fetchInformation } from "./api/deskly";
import { Booking } from "./lib/types";
import { renderBookingDate, renderSeatName } from "./lib/utils";
import { isSameDay, relativeDay, renderTimeRange } from "./lib/format";

function dayTitle(date: Date): string {
  return relativeDay(date) ?? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// Fetch this and next month's bookings, keep the future ones, sorted ascending.
// Uses usePromise (not useCachedPromise) so the in-memory Booking.date stays a Date — the disk cache
// would serialize it to a string and break date rendering.
async function fetchUpcomingBookings() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const [current, next] = await Promise.all([fetchBookings(year, month), fetchBookings(nextYear, nextMonth)]);

  return [...current, ...next].filter((b) => b.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export default function Command(props: LaunchProps) {
  const { showLocation, showFloor, showRoom } = getPreferenceValues<Preferences>();
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const { push } = useNavigation();
  const { data: information } = useCachedPromise(fetchInformation);
  const { data: bookings = [], isLoading, error, mutate } = usePromise(fetchUpcomingBookings);
  const openTodayBooking = (props.launchContext as { openTodayBooking?: boolean } | undefined)?.openTodayBooking;

  useEffect(() => {
    if (isLoading) return;
    if (bookings.length > 0) {
      updateCommandMetadata({ subtitle: `${renderSeatName(bookings[0])} - ${renderBookingDate(bookings[0])}` });
    } else {
      updateCommandMetadata({ subtitle: `No future bookings` });
    }
  }, [isLoading, bookings]);

  useEffect(() => {
    if (!openTodayBooking || isLoading) return;
    const today = new Date();
    const todayBooking = bookings.find((b) => isSameDay(b.date, today));
    if (todayBooking) push(<BookingDetail booking={todayBooking} onDeleted={popToRoot} />);
  }, [isLoading, bookings, openTodayBooking]);

  if (props.launchType === LaunchType.Background) {
    return;
  }

  if (error) {
    return (
      <DesklyEmptyView
        title="Error"
        description={error instanceof Error ? error.message : "An unexpected error occurred."}
        icon={Icon.ExclamationMark}
      />
    );
  }

  if (isLoading || bookings.length === 0) {
    return (
      <DesklyEmptyView
        title="No bookings found"
        description="Please check the website for more information"
        icon={Icon.XMarkCircle}
        isLoading={isLoading}
      />
    );
  }

  const isCheckedIn = (booking: Booking) => booking.userCheckedIn || checkedInIds.has(booking.id);
  const userName = [information?.user.firstName, information?.user.lastName].filter(Boolean).join(" ");

  const sections = buildSections(
    bookings,
    (booking) => booking.date.toDateString(),
    (first) => dayTitle(first.date),
    (booking) => ({
      key: booking.date.toDateString() + booking.seat?.id,
      profileImage: booking.profileImage,
      title: userName,
      subtitle: renderSeatName(booking),
      isCheckedIn: isCheckedIn(booking),
      timeRange: renderTimeRange(booking.from, booking.until),
      location: showLocation ? booking.seatBooked?.locationName ?? booking.seat?.locationName : undefined,
      floor: showFloor ? booking.seatBooked?.floorName ?? booking.seat?.floorName : undefined,
      room: showRoom ? booking.seatBooked?.roomName ?? booking.seat?.roomName : undefined,
      booking,
      onCheckedIn: (id) => setCheckedInIds((prev) => new Set([...prev, id])),
      onDeleted: (id) =>
        mutate(Promise.resolve(), {
          optimisticUpdate: (current) => (current ?? []).filter((b) => b.id !== id),
          shouldRevalidateAfter: false,
        }),
    })
  );

  return (
    <List isLoading={isLoading}>
      <OfficeList sections={sections} />
    </List>
  );
}
