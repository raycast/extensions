import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEvents } from "./hooks/useEvents";
import { EventFormValues } from "./utils/types";
import { validateDateString } from "./utils/date-utils";

interface EditEventFormProps {
  eventId: string;
}

export default function EditEventForm({ eventId }: EditEventFormProps) {
  const { getEvent, updateEvent, isLoading } = useEvents();
  const { pop } = useNavigation();
  const event = getEvent(eventId);

  async function handleSubmit(values: EventFormValues) {
    if (!values.title?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    const dateError = validateDateString(values.baseDate);
    if (dateError) {
      await showToast({
        style: Toast.Style.Failure,
        title: dateError,
      });
      return;
    }

    try {
      await updateEvent(eventId, values);
      await showToast({
        style: Toast.Style.Success,
        title: "Event updated",
        message: values.title,
      });
      pop();
    } catch (error) {
      await showFailureToast(error);
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  if (!event) {
    return (
      <Form>
        <Form.Description text="Event not found" />
      </Form>
    );
  }

  return (
    <Form
      navigationTitle="Edit Event"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Birthday, Anniversary, etc."
        defaultValue={event.title}
        autoFocus
      />
      <Form.TextField
        id="baseDate"
        title="Date"
        placeholder="YYYY-MM-DD (e.g., 2025-12-25)"
        defaultValue={event.baseDate}
        info="Enter date in YYYY-MM-DD format"
      />
      <Form.Dropdown id="repeat" title="Repeat" defaultValue={event.repeat}>
        <Form.Dropdown.Item value="none" title="One-time" />
        <Form.Dropdown.Item value="yearly" title="Yearly" />
        <Form.Dropdown.Item value="monthly" title="Monthly" />
      </Form.Dropdown>
    </Form>
  );
}
