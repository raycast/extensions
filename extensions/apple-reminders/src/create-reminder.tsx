import { ActionPanel, Action, Form, Icon, showToast, Toast, open, closeMainWindow, useNavigation } from "@raycast/api";
import { FormValidation, MutatePromise, useForm } from "@raycast/utils";
import { format } from "date-fns";

import { createReminder } from "./api";
import { getPriorityIcon } from "./helpers";
import { List, Reminder, useData } from "./hooks/useData";

type CreateReminderValues = {
  title: string;
  notes: string;
  dueDate: Date | null;
  priority: string;
  listId: string;
  isRecurring: boolean;
  frequency: string;
  interval: string;
};

type CreateReminderFormProps = {
  listId?: string;
  mutate?: MutatePromise<{ reminders: Reminder[]; lists: List[] } | undefined>;
};

export function CreateReminderForm({ listId, mutate }: CreateReminderFormProps) {
  const { pop } = useNavigation();
  const { data } = useData();

  const defaultList = data?.lists.find((list) => list.isDefault);

  const { itemProps, handleSubmit, reset, focus, values } = useForm<CreateReminderValues>({
    initialValues: {
      listId: listId ?? defaultList?.id ?? "",
    },
    validation: {
      title: FormValidation.Required,
      interval: (value) => {
        if (!values.isRecurring) return;
        if (!value) return "Interval is required";
        if (isNaN(Number(value))) return "Interval must be a number";
      },
    },
    async onSubmit(values) {
      try {
        const payload: {
          title: string;
          listId?: string;
          notes?: string;
          dueDate?: string;
          priority?: string;
          recurrence?: {
            frequency: string;
            interval: number;
          };
        } = {
          title: values.title,
          listId: values.listId,
        };

        if (values.notes) {
          payload.notes = values.notes;
        }

        if (values.dueDate) {
          payload.dueDate = Form.DatePicker.isFullDay(values.dueDate)
            ? format(values.dueDate, "yyyy-MM-dd")
            : values.dueDate.toISOString();
        }

        if (values.isRecurring) {
          payload.recurrence = {
            frequency: values.frequency,
            interval: Number(values.interval),
          };
        }

        if (values.priority) {
          payload.priority = values.priority;
        }

        const reminder = await createReminder(payload);

        await showToast({
          style: Toast.Style.Success,
          title: "Created Reminder",
          message: reminder.title,
          primaryAction: {
            title: "Open in Reminders",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: () => {
              open(reminder.openUrl);
            },
          },
        });

        // Redirect the user to the list if coming from an empty state
        if (listId && mutate) {
          await mutate();
          pop();
        }

        reset({
          title: "",
          notes: "",
          dueDate: null,
          priority: "",
          listId: "",
        });

        focus("title");
      } catch (error) {
        console.log(error);
        const message = error instanceof Error ? error.message : JSON.stringify(error);

        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to create reminder",
          message,
        });
      }
    },
  });

  let recurrenceDescription = "";
  if (values.frequency && values.interval) {
    const intervalNum = Number(values.interval);

    let repetitionPeriod = "";
    switch (values.frequency) {
      case "daily":
        repetitionPeriod = intervalNum > 1 ? `${intervalNum} days` : "day";
        break;
      case "weekly":
        repetitionPeriod = intervalNum > 1 ? `${intervalNum} weeks` : "week";
        break;
      case "monthly":
        repetitionPeriod = intervalNum > 1 ? `${intervalNum} months` : "month";
        break;
      case "yearly":
        repetitionPeriod = intervalNum > 1 ? `${intervalNum} years` : "year";
        break;
      default:
        repetitionPeriod = "";
    }

    recurrenceDescription = repetitionPeriod ? `This reminder will repeat every ${repetitionPeriod}.` : "";
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Reminder" />
          <Action.SubmitForm
            onSubmit={async (values) => {
              await closeMainWindow();
              await handleSubmit(values as CreateReminderValues);
            }}
            title="Create Reminder and Close Window"
          />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="New Reminder" />
      <Form.TextArea {...itemProps.notes} title="Notes" placeholder="Add some notes" />
      <Form.Separator />

      <Form.DatePicker {...itemProps.dueDate} title="Due Date" min={new Date()} />
      {values.dueDate ? (
        <>
          <Form.Checkbox {...itemProps.isRecurring} label="Is Recurring" />
          {values.isRecurring ? (
            <>
              <Form.Dropdown {...itemProps.frequency} title="Frequency">
                <Form.Dropdown.Item title="Daily" value="daily" />
                <Form.Dropdown.Item title="Weekly" value="weekly" />
                <Form.Dropdown.Item title="Monthly" value="monthly" />
                <Form.Dropdown.Item title="Yearly" value="yearly" />
              </Form.Dropdown>
              <Form.TextField {...itemProps.interval} title="Interval" defaultValue="1" />
              <Form.Description text={recurrenceDescription} />
              <Form.Separator />
            </>
          ) : null}
        </>
      ) : null}

      <Form.Dropdown {...itemProps.priority} title="Priority" storeValue>
        <Form.Dropdown.Item title="None" value="" />
        <Form.Dropdown.Item title="High" value="high" icon={getPriorityIcon("high")} />
        <Form.Dropdown.Item title="Medium" value="medium" icon={getPriorityIcon("medium")} />
        <Form.Dropdown.Item title="Low" value="low" icon={getPriorityIcon("low")} />
      </Form.Dropdown>
      <Form.Dropdown {...itemProps.listId} title="List" storeValue>
        {data?.lists.map((list) => {
          return (
            <Form.Dropdown.Item
              key={list.id}
              title={list.title}
              value={list.id}
              icon={{ source: Icon.Circle, tintColor: list.color }}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}

export default function Command() {
  return <CreateReminderForm />;
}
