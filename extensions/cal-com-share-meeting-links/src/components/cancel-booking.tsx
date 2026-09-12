import { Action, ActionPanel, Color, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { CalBooking, cancelBooking } from "@api/cal.com";
import { FormValidation, MutatePromise, showFailureToast, useForm } from "@raycast/utils";

export interface CancelBookingFormValues {
  reason: string;
}

interface CancelBookingProps {
  bookingUid: string;
  mutate: MutatePromise<CalBooking[] | undefined>;
  /** Optional callback invoked after a successful cancel (e.g. to revalidate
   *  the Cancelled section in the parent list). */
  onAfterCancel?: () => void | Promise<void>;
}

export function CancelBooking({ bookingUid, mutate, onAfterCancel }: CancelBookingProps) {
  const { pop } = useNavigation();

  const handleCancelBooking = async (reason: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Cancelling booking" });
    try {
      await cancelBooking(bookingUid, reason);
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
        if (!bookings) return;
        // Sectioned list: drop the booking from the source section entirely.
        return bookings.filter((b) => b.uid !== bookingUid);
      },
    });
    if (onAfterCancel) await onAfterCancel();
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
