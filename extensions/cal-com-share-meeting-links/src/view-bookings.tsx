import { Action, ActionPanel, Color, Icon, List, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import { CalBooking, confirmBooking, declineBooking, formatDateTime, formatTime, useBookings } from "@api/cal.com";
import { CancelBooking } from "@components/cancel-booking";

export default function viewBookings() {
  const { data: items, isLoading, error, mutate } = useBookings();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details", false);

  const handleConfirmBooking = async (bookingUid: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Confirming booking" });
    try {
      await confirmBooking(bookingUid);
      toast.style = Toast.Style.Success;
      toast.title = "Booking Confirmed";
      toast.message = "Booking has been successfully accepted";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to confirm booking" });
      throw error;
    }
  };

  const handleDeclineBooking = async (bookingUid: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Declining booking" });
    try {
      await declineBooking(bookingUid);
      toast.style = Toast.Style.Success;
      toast.title = "Booking Declined";
      toast.message = "Booking has been successfully declined";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to decline booking" });
      throw error;
    }
  };

  const handleConfirmAndMutate = async (item: CalBooking) => {
    await mutate(handleConfirmBooking(item.uid), {
      optimisticUpdate: (bookings) => {
        if (!bookings) {
          return;
        }
        return bookings.map((b) => (b.id === item.id ? { ...b, status: "accepted" } : b));
      },
    });
  };

  const handleDeclineAndMutate = async (item: CalBooking) => {
    await mutate(handleDeclineBooking(item.uid), {
      optimisticUpdate: (bookings) => {
        if (!bookings) {
          return;
        }
        return bookings.map((b) => (b.id === item.id ? { ...b, status: "rejected" } : b));
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
              {item.meetingUrl && (
                <Action.OpenInBrowser
                  title="Open Video Call"
                  url={item.meetingUrl}
                  icon={Icon.Video}
                  shortcut={{ modifiers: ["cmd"], key: "v" }}
                />
              )}
              <ActionPanel.Submenu title="Update Status" icon={Icon.Pencil} shortcut={{ modifiers: ["cmd"], key: "s" }}>
                <Action
                  title="Accept"
                  icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                  onAction={() => handleConfirmAndMutate(item)}
                />
                <Action
                  title="Decline"
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  onAction={() => handleDeclineAndMutate(item)}
                />
              </ActionPanel.Submenu>
              <Action.Push
                title="Cancel Booking"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                target={<CancelBooking bookingUid={item.uid} mutate={mutate} />}
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
                  ...(item.meetingUrl
                    ? [
                        {
                          icon: { source: Icon.Video, tintColor: Color.Yellow },
                          tooltip: "Video Call",
                        },
                      ]
                    : []),
                  ...(item.location
                    ? [
                        {
                          icon: { source: Icon.Pin, tintColor: Color.Yellow },
                          tooltip: "In Person",
                        },
                      ]
                    : []),
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
                    icon={getIconForStatus(item.status)}
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
      ))}
    </List>
  );
}

function getIconForStatus(status: string) {
  switch (status) {
    case "accepted":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "rejected":
    case "cancelled":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "pending":
      return { source: Icon.Clock, tintColor: Color.Orange };
    default:
      return { source: Icon.Circle, tintColor: Color.Purple };
  }
}
