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
import { addMilliseconds, format, startOfToday } from "date-fns";
import { createReminder } from "swift:../swift/AppleReminders";

import LocationForm from "./components/LocationForm";
import { getIntervalValidationError, getPriorityIcon } from "./helpers";
import { List, Reminder, useData } from "./hooks/useData";
import useLocations, { Location } from "./hooks/useLocations";

export type Frequency = "daily" | "weekdays" | "weekends" | "weekly" | "monthly" | "yearly";
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
  location: string;
  address: string;
  proximity: string;
  radius: string;
};

type CreateReminderFormProps = {
  draftValues?: Partial<CreateReminderValues>;
  listId?: string;
  mutate?: MutatePromise<{ reminders: Reminder[]; lists: List[] } | undefined>;
};

export function CreateReminderForm({ draftValues, listId, mutate }: CreateReminderFormProps) {
  const { pop } = useNavigation();
  const { data, isLoading } = useData();

  const { locations, addLocation } = useLocations();

  const defaultList = data?.lists.find((list) => list.isDefault);

  const { selectDefaultList, selectTodayAsDefault } = getPreferenceValues<Preferences.CreateReminder>();
  let initialListId;
  if (listId !== "all") {
    initialListId = listId;
  } else if (draftValues?.listId) {
    initialListId = draftValues.listId;
  } else if (selectDefaultList && defaultList) {
    initialListId = defaultList.id;
  }

  let initialDueDate;
  if (draftValues?.dueDate) {
    initialDueDate = draftValues?.dueDate;
  } else if (selectTodayAsDefault) {
    initialDueDate = addMilliseconds(startOfToday(), 1);
  }

  const { itemProps, handleSubmit, focus, values, setValue } = useForm<CreateReminderValues>({
    initialValues: {
      title: draftValues?.title ?? "",
      notes: draftValues?.notes ?? "",
      dueDate: initialDueDate,
      priority: draftValues?.priority,
      listId: initialListId,
      isRecurring: draftValues?.isRecurring ?? false,
      frequency: draftValues?.frequency,
      interval: draftValues?.interval,
      location: draftValues?.location ?? "",
      address: draftValues?.address,
      proximity: draftValues?.proximity,
      radius: draftValues?.radius,
    },
    validation: {
      title: FormValidation.Required,
      interval: (value) => {
        if (!values.isRecurring) return;
        return getIntervalValidationError(value);
      },
      radius: (value) => {
        if (!values.address) return;
        if (isNaN(Number(value))) return "Radius must be a number";
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

        if (values.location === "custom" || values.address) {
          payload.address = values.address;

          if (values.proximity) {
            payload.proximity = values.proximity;
          }

          if (values.radius) {
            payload.radius = parseInt(values.radius);
          }
        }

        const savedLocation = locations.find((location) => location.id === values.location);
        if (savedLocation) {
          payload.address = savedLocation.address;
          payload.proximity = savedLocation.proximity;
          payload.radius = parseInt(savedLocation.radius);
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
        setValue("location", "");
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
  if (values.frequency && !getIntervalValidationError(values.interval)) {
    const intervalNum = Number(values.interval);

    let repetitionPeriod = "";
    switch (values.frequency) {
      case "daily":
        repetitionPeriod = intervalNum > 1 ? `${intervalNum} days` : "day";
        break;
      case "weekdays":
        repetitionPeriod = intervalNum > 1 ? `${intervalNum} weeks on weekdays` : "week on weekdays";
        break;
      case "weekends":
        repetitionPeriod = intervalNum > 1 ? `${intervalNum} weekends` : "weekend";
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

  async function addLocationsAndSetValue(value: Location) {
    await addLocation(value);
    setValue("location", value.id);
  }

  const hasLocations = locations.length > 0;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Create Reminder" />
          <Action.SubmitForm
            icon={Icon.Window}
            onSubmit={async (values) => {
              await closeMainWindow({ popToRootType: PopToRootType.Immediate });
              await handleSubmit(values as CreateReminderValues);
            }}
            title="Create Reminder and Close Window"
          />
          <Action.Push
            icon={Icon.Pin}
            title="Add Saved Location"
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            target={<LocationForm onSubmit={addLocationsAndSetValue} />}
          />
        </ActionPanel>
      }
      enableDrafts={!listId}
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="New Reminder" />
      <Form.TextArea {...itemProps.notes} title="Notes" placeholder="Add some notes" />
      <Form.Separator />

      <Form.DatePicker {...itemProps.dueDate} title="Date" />
      {values.dueDate ? (
        <>
          <Form.Checkbox {...itemProps.isRecurring} label="Is Recurring" />
          {values.isRecurring ? (
            <>
              <Form.Dropdown {...itemProps.frequency} title="Frequency">
                <Form.Dropdown.Item title="Daily" value="daily" />
                <Form.Dropdown.Item title="Weekdays" value="weekdays" />
                <Form.Dropdown.Item title="Weekends" value="weekends" />
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

      <Form.Dropdown {...itemProps.priority} title="Priority" storeValue>
        <Form.Dropdown.Item title="None" value="" />
        <Form.Dropdown.Item title="High" value="high" icon={getPriorityIcon("high")} />
        <Form.Dropdown.Item title="Medium" value="medium" icon={getPriorityIcon("medium")} />
        <Form.Dropdown.Item title="Low" value="low" icon={getPriorityIcon("low")} />
      </Form.Dropdown>

      <Form.Separator />

      {hasLocations ? (
        <Form.Dropdown {...itemProps.location} title="Location">
          <Form.Dropdown.Item title="None" value="" />

          {locations.map((location) => {
            return (
              <Form.Dropdown.Item icon={location.icon} key={location.id} title={location.name} value={location.id} />
            );
          })}

          <Form.Dropdown.Item icon={Icon.Pencil} title="Custom Location" value="custom" />
        </Form.Dropdown>
      ) : null}

      {values.location === "custom" || !hasLocations ? (
        <>
          <Form.TextField {...itemProps.address} title="Address" placeholder="Enter an address" />
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
    </Form>
  );
}

export default function Command({ draftValues }: LaunchProps<{ draftValues: CreateReminderValues }>) {
  return <CreateReminderForm draftValues={draftValues} />;
}
