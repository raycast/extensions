import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  openCommandPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";
import {
  CancelBookingForm,
  CancelBookingProps,
  cancelBooking,
  formatDateTime,
  formatTime,
  updateBooking,
  useBookings,
} from "./services/cal.com";

export default function viewBookings() {
  const { data: items, isLoading, error, revalidate } = useBookings();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details", false);

  if (error) {
    showToast({
      title: "Unable to load your events",
      message: "Check your API key",
      style: Toast.Style.Failure,
      primaryAction: { onAction: openCommandPreferences, title: "Open Preferences" },
    });
  }

  const handleUpdateBookingStatus = async (bookingId: number, status: string) => {
    const data = { status };
    try {
      await updateBooking(bookingId, data);
      revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: "Booking Status Updated",
        message: `Booking status has been successfully updated to ${status.toLowerCase()}`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to update booking status" });
    }
  };

  return (
    <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
      {items?.map((item) => (
        <List.Item
          key={item.id}
          icon={{
            source: Icon.Circle,
            tintColor:
              item.status === "ACCEPTED"
                ? Color.Green
                : item.status === "PENDING"
                ? Color.Yellow
                : item.status === "CANCELLED"
                ? Color.Red
                : Color.Purple,
          }}
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
                  icon={Icon.CheckCircle}
                  onAction={async () => {
                    handleUpdateBookingStatus(item.id, "ACCEPTED");
                    revalidate();
                  }}
                />
                <Action
                  title="Reject"
                  icon={Icon.XMarkCircle}
                  onAction={async () => {
                    handleUpdateBookingStatus(item.id, "REJECTED");
                    revalidate();
                  }}
                />
                <Action
                  title="Pending"
                  icon={Icon.Clock}
                  onAction={async () => {
                    handleUpdateBookingStatus(item.id, "PENDING");
                    revalidate();
                  }}
                />
              </ActionPanel.Submenu>
              <Action.Push
                title="Cancel Booking"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                target={<CancelBooking bookingId={item.id} revalidate={revalidate} />}
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
              markdown={item.description ? item.description : "No description available."}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()}
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

function CancelBooking({ bookingId, revalidate }: CancelBookingProps) {
  const { pop } = useNavigation();

  const handleCancelBooking = async (values: CancelBookingForm) => {
    try {
      await confirmAlert({
        title: "Cancel Booking",
        message: "Are you sure you want to cancel this booking?",
        icon: Icon.XMarkCircle,
        primaryAction: {
          title: "Yes",
          onAction: async () => {
            await cancelBooking(bookingId, values.reason);

            await showToast({
              style: Toast.Style.Success,
              title: "Booking Cancelled",
              message: "Booking has been successfully cancelled",
            });

            revalidate();
            pop();
          },
        },
        dismissAction: {
          title: "No",
          onAction: () => pop(),
        },
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to cancel booking" });
    }
  };

  return (
    <Form
      navigationTitle="Cancel Booking"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Cancel Booking" icon={Icon.XMarkCircle} onSubmit={handleCancelBooking} />
        </ActionPanel>
      }
    >
      <Form.TextField id="reason" title="Reason" />
    </Form>
  );
}
