import {
  ActionPanel,
  Action,
  Form,
  Icon,
  showToast,
  Toast,
  open,
  closeMainWindow,
  useNavigation,
  getPreferenceValues,
  LaunchProps,
  PopToRootType,
} from "@raycast/api";
import { FormValidation, MutatePromise, useForm } from "@raycast/utils";
import { format } from "date-fns";
import { createReminder } from "swift:../swift/AppleReminders";

import { getPriorityIcon } from "./helpers";
import { List, Reminder, useData } from "./hooks/useData";

type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type NewReminder = {
  title: string;
  listId?: string;
  notes?: string;
  dueDate?: string;
  priority?: string;
  recurrence?: {
    frequency: Frequency;
    interval: number;
    endDate?: string;
  };
  address?: string;
  proximity?: string;
  radius?: number;
};

type CreateReminderValues = {
  title: string;
  notes: string;
  dueDate: Date | null;
  priority: string;
  listId: string;
  isRecurring: boolean;
  frequency: string;
  interval: string;
  address: string;
  proximity: string;
  radius: string;
};

type CreateReminderFormProps = {
  draftValues?: CreateReminderValues;
  listId?: string;
  mutate?: MutatePromise<{ reminders: Reminder[]; lists: List[] } | undefined>;
};

export function CreateReminderForm({ draftValues, listId, mutate }: CreateReminderFormProps) {
  const { pop } = useNavigation();
  const { data, isLoading } = useData();

  const defaultList = data?.lists.find((list) => list.isDefault);

  const { selectDefaultList } = getPreferenceValues<Preferences.CreateReminder>();
  const { itemProps, handleSubmit, focus, values, setValue } = useForm<CreateReminderValues>({
    initialValues: {
      title: draftValues?.title ?? "",
      notes: draftValues?.notes ?? "",
      dueDate: draftValues?.dueDate,
      priority: draftValues?.priority,
      listId: listId ?? draftValues?.listId ?? (selectDefaultList ? defaultList?.id : ""),
      isRecurring: draftValues?.isRecurring ?? false,
      frequency: draftValues?.frequency,
      interval: draftValues?.interval,
      address: draftValues?.address,
      proximity: draftValues?.proximity,
      radius: draftValues?.radius,
    },
    validation: {
      title: FormValidation.Required,
      interval: (value) => {
        if (!values.isRecurring) return;
        if (!value) return "Interval is required";
        if (isNaN(Number(value))) return "Interval must be a number";
      },
      radius: (value) => {
        if (!values.address) return;
        if (isNaN(Number(value))) return "Interval must be a number";
      },
    },
    async onSubmit(values) {
      try {
        const payload: NewReminder = {
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
            frequency: values.frequency as Frequency,
            interval: Number(values.interval),
          };
        }

        if (values.priority) {
          payload.priority = values.priority;
        }

        if (values.address) {
          payload.address = values.address;

          if (values.proximity) {
            payload.proximity = values.proximity;
          }

          if (values.radius) {
            payload.radius = parseInt(values.radius);
          }
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

        setValue("title", "");
        setValue("notes", "");
        setValue("address", "");
        setValue("radius", "");

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
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Reminder" />
          <Action.SubmitForm
            onSubmit={async (values) => {
              await closeMainWindow({ popToRootType: PopToRootType.Immediate });
              await handleSubmit(values as CreateReminderValues);
            }}
            title="Create Reminder and Close Window"
          />
        </ActionPanel>
      }
      enableDrafts={!listId}
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="New Reminder" />
      <Form.TextArea {...itemProps.notes} title="Notes" placeholder="Add some notes" />
      <Form.Separator />

      <Form.DatePicker {...itemProps.dueDate} title="Due Date" />
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
              <Form.TextField {...itemProps.interval} title="Interval" placeholder="1" />
              <Form.Description text={recurrenceDescription} />
              <Form.Separator />
            </>
          ) : null}
        </>
      ) : null}

      <Form.TextField {...itemProps.address} title="Location" placeholder="Address" />

      {values.address ? (
        <>
          <Form.Dropdown
            {...itemProps.proximity}
            title="Proximity"
            info="Whether you want to trigger the reminder when arriving at the place or when leaving it"
          >
            <Form.Dropdown.Item title="Arriving" value="enter" />
            <Form.Dropdown.Item title="Leaving" value="leave" />
          </Form.Dropdown>
          <Form.TextField
            {...itemProps.radius}
            title="Radius"
            placeholder="100"
            info="The minimum distance in meters from the place that would trigger the reminder"
          />
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

export default function Command({ draftValues }: LaunchProps<{ draftValues: CreateReminderValues }>) {
  return <CreateReminderForm draftValues={draftValues} />;
}
