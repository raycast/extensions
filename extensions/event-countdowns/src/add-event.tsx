import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEvents } from "./hooks/useEvents";
import { EventFormValues } from "./utils/types";
import { validateDateString, getTodayString } from "./utils/date-utils";

export default function AddEventForm() {
  const { addEvent } = useEvents();
  const { pop } = useNavigation();

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
      await addEvent(values);
      await showToast({
        style: Toast.Style.Success,
        title: "Event added",
        message: values.title,
      });
      pop();
    } catch (error) {
      await showFailureToast(error);
    }
  }

  return (
    <Form
      navigationTitle="Add Event"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Event" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Birthday, Anniversary, etc." autoFocus />
      <Form.TextField
        id="baseDate"
        title="Date"
        placeholder="YYYY-MM-DD (e.g., 2025-12-25)"
        defaultValue={getTodayString()}
        info="Enter date in YYYY-MM-DD format"
      />
      <Form.Dropdown id="repeat" title="Repeat" defaultValue="none">
        <Form.Dropdown.Item value="none" title="One-time" />
        <Form.Dropdown.Item value="yearly" title="Yearly" />
        <Form.Dropdown.Item value="monthly" title="Monthly" />
      </Form.Dropdown>
    </Form>
  );
}
