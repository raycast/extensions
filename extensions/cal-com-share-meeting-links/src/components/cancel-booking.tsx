import { Action, ActionPanel, Color, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { CalBookingResp, cancelBooking } from "@api/cal.com";
import { FormValidation, MutatePromise, showFailureToast, useForm } from "@raycast/utils";

export interface CancelBookingFormValues {
  reason: string;
}

interface CancelBookingProps {
  bookingId: number;
  mutate: MutatePromise<CalBookingResp["bookings"] | undefined>;
}

export function CancelBooking({ bookingId, mutate }: CancelBookingProps) {
  const { pop } = useNavigation();

  const handleCancelBooking = async (reason: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Cancelling booking" });
    try {
      await cancelBooking(bookingId, reason);
      toast.style = Toast.Style.Success;
      toast.title = "Booking Cancelled";
      toast.message = "Booking has been successfully cancelled";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to cancel booking" });
      throw error;
    } finally {
      pop();
    }
  };

  const handleCancelAndMutate = async (reason: string) => {
    await mutate(handleCancelBooking(reason), {
      optimisticUpdate: (bookings) => {
        if (!bookings) {
          return;
        }

        return bookings.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b));
      },
    });
  };

  const { itemProps, handleSubmit } = useForm<CancelBookingFormValues>({
    onSubmit: (values) =>
      confirmAlert({
        title: "Cancel Booking",
        message: "Are you sure you want to cancel this booking?",
        icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
        primaryAction: {
          title: "Yes",
          onAction: () => handleCancelAndMutate(values.reason),
        },
        dismissAction: {
          title: "No",
          onAction: pop,
        },
      }),
    validation: { reason: FormValidation.Required },
    initialValues: { reason: "" },
  });

  return (
    <Form
      navigationTitle="Cancel Booking"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Cancel Booking" icon={Icon.XMarkCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title={"Reason"} placeholder={"Reason for cancellation"} {...itemProps.reason} />
    </Form>
  );
}
