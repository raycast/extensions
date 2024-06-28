import { Action, ActionPanel, Color, Icon, List, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { formatDateTime, formatTime, updateBooking, useBookings } from "@api/cal.com";
import { CancelBooking } from "@components/cancel-booking";

export default function viewBookings() {
  const { data: items, isLoading, error, mutate } = useBookings();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details", false);

  const handleUpdateBookingStatus = async (bookingId: number, status: string) => {
    const data = { status };
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating booking status" });
    try {
      await updateBooking(bookingId, data);
      toast.style = Toast.Style.Success;
      toast.title = "Booking Status Updated";
      toast.message = `Booking status has been successfully updated to ${status.toLowerCase()}`;
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update booking status" });
      throw error;
    }
  };

  const handleUpdateAndMutate = async (bookingId: number, status: string) => {
    await mutate(handleUpdateBookingStatus(bookingId, status), {
      optimisticUpdate: (bookings) => {
        if (!bookings) {
          return;
        }

        return bookings.map((b) => (b.id === bookingId ? { ...b, status } : b));
      },
    });
  };

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {error && (
        <List.EmptyView
          title="Unable to load your events"
          description="Check your API key"
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openCommandPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      )}
      {items?.map((item) => (
        <List.Item
          key={item.id}
          icon={getIconForStatus(item.status)}
          title={item.title}
          subtitle={!isShowingDetail ? formatDateTime(item.startTime) + " - " + formatTime(item.endTime) : undefined}
          actions={
            <ActionPanel>
              <Action
                title={!isShowingDetail ? "Show Details" : "Hide Details"}
                icon={!isShowingDetail ? Icon.Eye : Icon.EyeDisabled}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
              />
              <Action.OpenInBrowser title="Open Booking in Browser" url={`https://cal.com/booking/${item.uid}`} />
              <ActionPanel.Submenu title="Update Status" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "s" }}>
                <Action
                  title="Accept"
                  icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                  onAction={() => handleUpdateAndMutate(item.id, "ACCEPTED")}
                />
                <Action
                  title="Reject"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  onAction={() => handleUpdateAndMutate(item.id, "REJECTED")}
                />
                <Action
                  title="Pending"
                  icon={{ source: Icon.Clock, tintColor: Color.Orange }}
                  onAction={() => handleUpdateAndMutate(item.id, "PENDING")}
                />
              </ActionPanel.Submenu>
              <Action.Push
                title="Cancel Booking"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                target={<CancelBooking bookingId={item.id} mutate={mutate} />}
              />
              <Action.OpenInBrowser
                title="Open All Bookings in Browser"
                url="https://app.cal.com/bookings/upcoming"
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={item.description ? item.description : undefined}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()}
                    icon={getIconForStatus(item.status)}
                  />
                  <List.Item.Detail.Metadata.Label title="Start" text={formatDateTime(item.startTime)} />
                  <List.Item.Detail.Metadata.Label title="End" text={formatDateTime(item.endTime)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

function getIconForStatus(status: string) {
  switch (status) {
    case "ACCEPTED":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "REJECTED":
    case "CANCELLED":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "PENDING":
      return { source: Icon.Clock, tintColor: Color.Orange };
    default:
      return { source: Icon.Circle, tintColor: Color.Purple };
  }
}
