import { Action, ActionPanel, Color, Icon, List, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import {
  CalBooking,
  confirmBooking,
  declineBooking,
  formatDateTime,
  formatTime,
  useCancelledBookings,
  useCurrentUser,
  usePastBookings,
  usePendingBookings,
  useUpcomingBookings,
} from "@api/cal.com";
import { CancelBooking } from "@components/cancel-booking";
import { RequestReschedule } from "@components/request-reschedule";
import { iconForBookingStatus } from "@/lib/bookings";

export default function viewBookings() {
  const pending = usePendingBookings();
  const upcoming = useUpcomingBookings();
  const past = usePastBookings();
  const [showCancelled, setShowCancelled] = useCachedState("show-cancelled", false);
  const cancelled = useCancelledBookings(showCancelled);
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details", false);
  const [showAllBookings, setShowAllBookings] = useCachedState("show-all-bookings", false);
  const { data: currentUser } = useCurrentUser();

  const isLoading = pending.isLoading || upcoming.isLoading || past.isLoading || (showCancelled && cancelled.isLoading);

  const anyError = pending.error || upcoming.error || past.error || (showCancelled && cancelled.error);

  // Filter bookings to those hosted by the current user (unless "show all" is on).
  // The Cal.com API returns all bookings the user can see, including team bookings
  // hosted by others — this client-side filter narrows to the user's own bookings.
  const filterToMine = (list: CalBooking[] | undefined): CalBooking[] | undefined => {
    if (!list) return list;
    if (showAllBookings) return list;
    if (!currentUser) return list; // before /me resolves, show everything to avoid a flicker
    return list.filter((b) => b.hosts.some((h) => h.id === currentUser.id));
  };

  const filteredPending = filterToMine(pending.data);
  const filteredUpcoming = filterToMine(upcoming.data);
  const filteredPast = filterToMine(past.data);
  const filteredCancelled = filterToMine(cancelled.data);

  // ─── Mutation handlers ─────────────────────────────────────────────────
  const handleConfirm = async (item: CalBooking) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Confirming booking" });
    try {
      await pending.mutate(confirmBooking(item.uid), {
        optimisticUpdate: (list) => list?.filter((b) => b.uid !== item.uid),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Booking confirmed";
      await upcoming.revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Failed to confirm booking" });
    }
  };

  const handleDecline = async (item: CalBooking) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Declining booking" });
    try {
      await pending.mutate(declineBooking(item.uid), {
        optimisticUpdate: (list) => list?.filter((b) => b.uid !== item.uid),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Booking declined";
      if (showCancelled) await cancelled.revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Failed to decline booking" });
    }
  };

  const handleAfterCancel = async () => {
    if (showCancelled) await cancelled.revalidate();
  };

  // ─── Action helpers used in multiple action panels ─────────────────────
  const toggleDetailsAction = (
    <Action
      title={!isShowingDetail ? "Show Details" : "Hide Details"}
      icon={!isShowingDetail ? Icon.Eye : Icon.EyeDisabled}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() => setIsShowingDetail(!isShowingDetail)}
    />
  );

  const toggleCancelledAction = (
    <Action
      title={showCancelled ? "Hide Cancelled" : "Show Cancelled"}
      icon={showCancelled ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["cmd"], key: "h" }}
      onAction={() => setShowCancelled(!showCancelled)}
    />
  );

  const toggleShowAllAction = (
    <Action
      title={showAllBookings ? "Show Only My Bookings" : "Show All Bookings"}
      icon={showAllBookings ? Icon.Person : Icon.TwoPeople}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={() => setShowAllBookings(!showAllBookings)}
    />
  );

  const openAllBookingsAction = (
    <Action.OpenInBrowser
      title="Open All Bookings in Browser"
      url="https://app.cal.com/bookings/upcoming"
      shortcut={{ modifiers: ["cmd"], key: "b" }}
    />
  );

  const renderItem = (item: CalBooking, extraActions: React.ReactNode) => (
    <List.Item
      key={item.id}
      icon={iconForBookingStatus(item.status)}
      title={item.title}
      actions={
        <ActionPanel>
          {/* Enter = safe view action; destructive actions live behind explicit shortcuts. */}
          <Action.OpenInBrowser
            title="Open Booking in Browser"
            url={`https://app.cal.com/bookings/upcoming?uid=${item.uid}`}
          />
          {item.meetingUrl && (
            <Action.OpenInBrowser
              title="Open Video Call"
              url={item.meetingUrl}
              icon={Icon.Video}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
            />
          )}
          {extraActions}
          {toggleDetailsAction}
          {toggleShowAllAction}
          {toggleCancelledAction}
          {openAllBookingsAction}
        </ActionPanel>
      }
      accessories={[
        ...(isShowingDetail
          ? []
          : [
              ...(item.meetingUrl
                ? [{ icon: { source: Icon.Video, tintColor: Color.Yellow }, tooltip: "Video Call" }]
                : []),
              ...(item.location ? [{ icon: { source: Icon.Pin, tintColor: Color.Yellow }, tooltip: "In Person" }] : []),
              {
                date: new Date(item.start),
                icon: { source: Icon.Calendar, tintColor: Color.Blue },
                tooltip: `${formatDateTime(item.start) + " - " + formatTime(item.end)}`,
              },
            ]),
        {
          icon: Icon.TwoPeople,
          tag: { value: String(item.attendees.length), color: Color.Magenta },
          tooltip: "Attendees",
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={item.description ? item.description : undefined}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Title" text={item.title} />
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                icon={iconForBookingStatus(item.status)}
              />
              <List.Item.Detail.Metadata.Label
                title="Start"
                text={formatDateTime(item.start)}
                icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Label
                title="End"
                text={formatDateTime(item.end)}
                icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
              />
              {item.meetingUrl && (
                <List.Item.Detail.Metadata.Link title="Video Call" target={item.meetingUrl} text={"Link"} />
              )}
              {item.location && (
                <List.Item.Detail.Metadata.Label
                  title={"Location"}
                  icon={{ source: Icon.Pin, tintColor: Color.Yellow }}
                  text={item.location}
                />
              )}
              <List.Item.Detail.Metadata.Separator />
              {item.attendees.map((a, i) => (
                <List.Item.Detail.Metadata.Label
                  key={i}
                  title={`Attendee #${i + 1}`}
                  text={a.name ? `${a.name} (${a.email})` : a.email}
                />
              ))}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Created"
                text={formatDateTime(item.createdAt)}
                icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );

  // ─── Render ────────────────────────────────────────────────────────────
  const noItemsAtAll =
    !isLoading &&
    !anyError &&
    (filteredPending?.length ?? 0) === 0 &&
    (filteredUpcoming?.length ?? 0) === 0 &&
    (filteredPast?.length ?? 0) === 0 &&
    (!showCancelled || (filteredCancelled?.length ?? 0) === 0);

  // Distinguish "nothing in the API" from "filter is hiding everything".
  const filterIsHidingItems =
    noItemsAtAll &&
    !showAllBookings &&
    ((pending.data?.length ?? 0) > 0 ||
      (upcoming.data?.length ?? 0) > 0 ||
      (past.data?.length ?? 0) > 0 ||
      (showCancelled && (cancelled.data?.length ?? 0) > 0));

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail && !noItemsAtAll} pagination={past.pagination}>
      {anyError && (
        <List.EmptyView
          title="Unable to load bookings"
          description="Check your API key"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openCommandPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      )}
      {noItemsAtAll && (
        <List.EmptyView
          title={filterIsHidingItems ? "No bookings hosted by you" : "No bookings found"}
          description={
            filterIsHidingItems
              ? "Press ⌘ ⇧ A to also show team bookings hosted by other people."
              : "Bookings will appear here once people book a meeting with you."
          }
          icon={Icon.Calendar}
          actions={
            <ActionPanel>
              {toggleShowAllAction}
              {openAllBookingsAction}
              {toggleCancelledAction}
            </ActionPanel>
          }
        />
      )}

      {(filteredPending?.length ?? 0) > 0 && (
        <List.Section title="Pending Confirmation">
          {filteredPending!.map((item) =>
            renderItem(
              item,
              <>
                <Action
                  title="Accept"
                  icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                  shortcut={{ modifiers: ["cmd"], key: "y" }}
                  onAction={() => handleConfirm(item)}
                />
                <Action
                  title="Decline"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  onAction={() => handleDecline(item)}
                />
                <Action.Push
                  title="Request Reschedule"
                  icon={{ source: Icon.Calendar, tintColor: Color.Orange }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  target={
                    <RequestReschedule
                      bookingUid={item.uid}
                      mutate={pending.mutate}
                      onAfterReschedule={handleAfterCancel}
                    />
                  }
                />
                <Action.Push
                  title="Cancel Booking"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  target={
                    <CancelBooking bookingUid={item.uid} mutate={pending.mutate} onAfterCancel={handleAfterCancel} />
                  }
                />
              </>,
            ),
          )}
        </List.Section>
      )}

      {(filteredUpcoming?.length ?? 0) > 0 && (
        <List.Section title="Upcoming">
          {filteredUpcoming!.map((item) =>
            renderItem(
              item,
              <>
                <Action.Push
                  title="Request Reschedule"
                  icon={{ source: Icon.Calendar, tintColor: Color.Orange }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  target={
                    <RequestReschedule
                      bookingUid={item.uid}
                      mutate={upcoming.mutate}
                      onAfterReschedule={handleAfterCancel}
                    />
                  }
                />
                <Action.Push
                  title="Cancel Booking"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  target={
                    <CancelBooking bookingUid={item.uid} mutate={upcoming.mutate} onAfterCancel={handleAfterCancel} />
                  }
                />
              </>,
            ),
          )}
        </List.Section>
      )}

      {(filteredPast?.length ?? 0) > 0 && (
        <List.Section title="Past">{filteredPast!.map((item) => renderItem(item, null))}</List.Section>
      )}

      {showCancelled && (filteredCancelled?.length ?? 0) > 0 && (
        <List.Section title="Cancelled">{filteredCancelled!.map((item) => renderItem(item, null))}</List.Section>
      )}
    </List>
  );
}
