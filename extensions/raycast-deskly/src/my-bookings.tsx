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
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import BookingDetail from "./components/BookingDetail";
import DesklyEmptyView from "./components/DesklyEmptyView";
import OfficeList, { OfficeListSection } from "./components/OfficeList";
import { fetchBookings, fetchInformation } from "./api/deskly";
import { Booking } from "./lib/types";
import { renderBookingDate, renderSeatName } from "./lib/utils";
import { isSameDay, relativeDay, renderTimeRange } from "./lib/format";

function dayTitle(date: Date): string {
  return relativeDay(date) ?? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function Command(props: LaunchProps) {
  const { showLocation, showFloor, showRoom } = getPreferenceValues<Preferences>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const { push } = useNavigation();
  const { data: information } = useCachedPromise(fetchInformation);
  const openTodayBooking = (props.launchContext as { openTodayBooking?: boolean } | undefined)?.openTodayBooking;

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;

      const [current, next] = await Promise.all([fetchBookings(year, month), fetchBookings(nextYear, nextMonth)]);

      const all = [...current, ...next]
        .filter((b) => b.date >= today)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      setBookings(all);
      setIsLoading(false);
    };

    fetchData().catch((err) => {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (bookings && bookings.length > 0) {
      updateCommandMetadata({ subtitle: `${renderSeatName(bookings[0])} - ${renderBookingDate(bookings[0])}` });
    } else {
      updateCommandMetadata({ subtitle: `No future bookings` });
    }
  }, [bookings]);

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
    return <DesklyEmptyView title="Error" description={error} icon={Icon.ExclamationMark} />;
  }

  if (!bookings || isLoading || bookings.length === 0) {
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

  const byDay = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const key = booking.date.toDateString();
    const group = byDay.get(key) ?? [];
    group.push(booking);
    byDay.set(key, group);
  }

  const sections: OfficeListSection[] = [...byDay.entries()].map(([, dayBookings]) => ({
    key: dayBookings[0].date.toDateString(),
    title: dayTitle(dayBookings[0].date),
    items: dayBookings.map((booking) => ({
      key: booking.date.toDateString() + booking.seat?.id,
      profileImage: booking.profileImage,
      title: [information?.user.firstName, information?.user.lastName].filter(Boolean).join(" "),
      subtitle: renderSeatName(booking),
      isCheckedIn: isCheckedIn(booking),
      timeRange: renderTimeRange(booking.from, booking.until),
      location: showLocation ? booking.seatBooked?.locationName ?? booking.seat?.locationName : undefined,
      floor: showFloor ? booking.seatBooked?.floorName ?? booking.seat?.floorName : undefined,
      room: showRoom ? booking.seatBooked?.roomName ?? booking.seat?.roomName : undefined,
      booking,
      onCheckedIn: (id) => setCheckedInIds((prev) => new Set([...prev, id])),
      onDeleted: (id) => setBookings((prev) => prev.filter((b) => b.id !== id)),
    })),
  }));

  return (
    <List isLoading={isLoading}>
      <OfficeList sections={sections} />
    </List>
  );
}
