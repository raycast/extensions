import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";
import { createEvent, MomentlyEvent, openEvent } from "./momently";

interface FormValues {
  title: string;
  date: Date | null;
  allDay: boolean;
  url: string;
  notes: string;
  flagged: boolean;
}

/** The next full hour, like a new event in the app */
function nextHour() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

export function CreateEventForm(props: { onCreate?: (event: MomentlyEvent) => void }) {
  const { pop } = useNavigation();
  const [allDay, setAllDay] = useState(false);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { title: "", date: nextHour(), allDay: false, url: "", notes: "", flagged: false },
    validation: {
      title: FormValidation.Required,
      date: FormValidation.Required,
      url: (value) =>
        value?.trim() && !URL.canParse(value.trim()) ? "Enter a full address, like https://…" : undefined,
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating event…" });

      try {
        const event = await createEvent({
          title: values.title.trim(),
          date: values.date!,
          allDay: values.allDay,
          url: values.url.trim() || undefined,
          notes: values.notes.trim() || undefined,
          flagged: values.flagged,
        });

        toast.style = Toast.Style.Success;
        toast.title = `Created “${event.title}”`;
        toast.primaryAction = {
          title: "Open in Momently",
          onAction: () => openEvent(event.id),
        };

        if (props.onCreate) {
          props.onCreate(event);
          pop();
        } else {
          await popToRoot({ clearSearchBar: true });
        }
      } catch (error) {
        await showFailureToast(error, { title: "Couldn't create event" });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Event" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Summer Vacation 🏖️" autoFocus {...itemProps.title} />
      <Form.DatePicker
        title={allDay ? "Date" : "Date & Time"}
        type={allDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
        {...itemProps.date}
      />
      <Form.Checkbox
        label="All day"
        {...itemProps.allDay}
        onChange={(value) => {
          setAllDay(value);
          itemProps.allDay.onChange?.(value);
        }}
      />
      <Form.Separator />
      <Form.TextField title="URL" placeholder="https://" {...itemProps.url} />
      <Form.TextArea title="Notes" placeholder="Optional" {...itemProps.notes} />
      <Form.Checkbox label="Flagged" {...itemProps.flagged} />
    </Form>
  );
}

export default function Command() {
  return <CreateEventForm />;
}
