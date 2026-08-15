import { Action, ActionPanel, Color, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { CalBooking, requestRescheduleBooking } from "@api/cal.com";
import { FormValidation, MutatePromise, showFailureToast, useForm } from "@raycast/utils";

interface RequestRescheduleFormValues {
  reason: string;
}

interface RequestRescheduleProps {
  bookingUid: string;
  mutate: MutatePromise<CalBooking[] | undefined>;
  onAfterReschedule?: () => void | Promise<void>;
}

export function RequestReschedule({ bookingUid, mutate, onAfterReschedule }: RequestRescheduleProps) {
  const { pop } = useNavigation();

  const handleRequest = async (reason: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Requesting reschedule" });
    try {
      await requestRescheduleBooking(bookingUid, reason);
      toast.style = Toast.Style.Success;
      toast.title = "Reschedule requested";
      toast.message = "The attendee will receive an email with a link to pick a new time.";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to request reschedule" });
      throw error;
    }
  };

  const handleRequestAndMutate = async (reason: string) => {
    try {
      await mutate(handleRequest(reason), {
        optimisticUpdate: (bookings) => {
          if (!bookings) return;
          return bookings.filter((b) => b.uid !== bookingUid);
        },
      });
    } catch {
      return; // leave form open so user can retry
    }
    if (onAfterReschedule) await onAfterReschedule();
    pop();
  };

  const { itemProps, handleSubmit } = useForm<RequestRescheduleFormValues>({
    onSubmit: (values) =>
      confirmAlert({
        title: "Request Reschedule",
        message: "This will cancel the booking and email the attendee a link to pick a new time. Are you sure?",
        icon: { source: Icon.Calendar, tintColor: Color.Orange },
        primaryAction: {
          title: "Yes, Request Reschedule",
          onAction: () => handleRequestAndMutate(values.reason),
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
      navigationTitle="Request Reschedule"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Request Reschedule" icon={Icon.Calendar} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title={"Reason"}
        placeholder={"Reason for requesting a reschedule (sent to the attendee)"}
        {...itemProps.reason}
      />
    </Form>
  );
}
