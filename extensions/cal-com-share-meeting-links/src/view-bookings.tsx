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
          actions={
            <ActionPanel>
              <Action
                title={!isShowingDetail ? "Show Details" : "Hide Details"}
                icon={!isShowingDetail ? Icon.Eye : Icon.EyeDisabled}
                onAction={() => setIsShowingDetail(!isShowingDetail)}
              />
              <Action.OpenInBrowser title="Open Booking in Browser" url={`https://cal.com/booking/${item.uid}`} />
              {item.metadata && (item.metadata["videoCallUrl"] as string | undefined) && (
                <Action.OpenInBrowser
                  title="Open Video Call"
                  url={item.metadata["videoCallUrl"] as string}
                  icon={Icon.Video}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
              )}
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
          accessories={[
            ...(isShowingDetail
              ? []
              : [
                  ...(item.metadata && (item.metadata["videoCallUrl"] as string | undefined)
                    ? [
                        {
                          icon: { source: Icon.Video, tintColor: Color.Yellow },
                          tooltip: "Video Call",
                        },
                      ]
                    : []),
                  ...(item.responses?.location?.optionValue
                    ? [
                        {
                          icon: { source: Icon.Pin, tintColor: Color.Yellow },
                          tooltip: "In Person",
                        },
                      ]
                    : []),
                  {
                    date: new Date(item.startTime),
                    icon: { source: Icon.Calendar, tintColor: Color.Blue },
                    tooltip: `${formatDateTime(item.startTime) + " - " + formatTime(item.endTime)}`,
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
                    text={item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()}
                    icon={getIconForStatus(item.status)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Start"
                    text={formatDateTime(item.startTime)}
                    icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="End"
                    text={formatDateTime(item.endTime)}
                    icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                  />
                  {item.metadata && (item.metadata["videoCallUrl"] as string | undefined) && (
                    <List.Item.Detail.Metadata.Link
                      title="Video Call"
                      target={item.metadata["videoCallUrl"] as string}
                      text={"Link"}
                    />
                  )}
                  {item.responses?.location?.optionValue && (
                    <List.Item.Detail.Metadata.Label
                      title={"Location"}
                      icon={{ source: Icon.Pin, tintColor: Color.Yellow }}
                      text={item.responses?.location?.optionValue}
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
