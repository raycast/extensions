import { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { Booking } from "../lib/types";
import { confirmDeleteBooking, failToast, profileIcon } from "../lib/utils";
import { isSameDay, renderTimeRange, toISODate } from "../lib/format";
import { checkInBooking, fetchRoomPlanImage } from "../api/deskly";

export default function BookingDetail({
  booking,
  onDeleted,
  personName,
  profileImage,
}: {
  booking: Booking;
  onDeleted?: () => void;
  personName?: string;
  profileImage?: string | null;
}) {
  const { apiUrl } = getPreferenceValues<Preferences>();
  const seat = booking.seatBooked ?? booking.seat;
  const [roomPlanDataUri, setRoomPlanDataUri] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(!!booking.seat?.room);
  const [checkedIn, setCheckedIn] = useState(booking.userCheckedIn ?? false);

  const isToday = isSameDay(booking.date, new Date());

  const dateStr = booking.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeRange = renderTimeRange(booking.from, booking.until);

  useEffect(() => {
    const seatObj = booking.seat;
    if (!seatObj?.room) return;

    setIsLoadingImage(true);
    fetchRoomPlanImage(seatObj.room, seatObj)
      .then(setRoomPlanDataUri)
      .finally(() => setIsLoadingImage(false));
  }, [booking.seat?.room]);

  const imageMarkdown = roomPlanDataUri ? `\n\n![Floor Plan](${roomPlanDataUri})` : "";

  return (
    <Detail
      isLoading={isLoadingImage}
      markdown={imageMarkdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            icon={Icon.Globe}
            url={`${apiUrl}/en/overview/${toISODate(booking.date)}`}
          />
          {isToday && !checkedIn && (
            <Action
              title="Check In"
              icon={Icon.CheckCircle}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Checking in…" });
                try {
                  await checkInBooking(booking.id);
                  setCheckedIn(true);
                  toast.style = Toast.Style.Success;
                  toast.title = "Booking confirmed";
                } catch (error) {
                  failToast(toast, "Check-in failed", error);
                }
              }}
            />
          )}
          {onDeleted && (
            <Action
              title="Delete Booking"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => confirmDeleteBooking(booking, onDeleted)}
            />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {personName && (
            <Detail.Metadata.Label title="Person" text={personName} icon={profileIcon(profileImage, apiUrl)} />
          )}
          {!personName && checkedIn && <Detail.Metadata.Label title="" text="Checked in" icon={Icon.CheckCircle} />}
          <Detail.Metadata.Label title="Date" text={dateStr} icon={Icon.Calendar} />
          {timeRange && <Detail.Metadata.Label title="Time" text={timeRange} icon={Icon.Clock} />}
          {booking.multipleBookings && (
            <Detail.Metadata.Label title="Multiple Bookings" icon={Icon.Ellipsis} text="Yes" />
          )}
          {seat && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Seat" text={seat.name} icon={Icon.Dot} />
              {seat.roomName && <Detail.Metadata.Label title="Room" text={seat.roomName} icon={Icon.Map} />}
              {seat.floorName && <Detail.Metadata.Label title="Floor" text={seat.floorName} icon={Icon.ArrowUp} />}
              {seat.locationName && (
                <Detail.Metadata.Label title="Location" text={seat.locationName} icon={Icon.Building} />
              )}
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
