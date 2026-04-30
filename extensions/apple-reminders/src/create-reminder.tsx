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
import { ReactElement, useRef } from "react";
import { createReminder } from "swift:../swift/AppleReminders";

import LocationForm from "./components/LocationForm";
import CustomizeCreateReminderForm from "./customize-create-reminder-form";
import { getIntervalValidationError, getPriorityIcon } from "./helpers";
import useCreateReminderFormLayout from "./hooks/useCreateReminderFormLayout";
import { List, Reminder, useData } from "./hooks/useData";
import useLocations, { Location } from "./hooks/useLocations";
import usePostCreateActions from "./hooks/usePostCreateActions";
import ManageCreateActions from "./manage-create-actions";
import { runPostCreateActions } from "./post-create-shortcuts";

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

type SubmitOptions = {
  closeWindowAfterCreate?: boolean;
};

export function CreateReminderForm({ draftValues, listId, mutate }: CreateReminderFormProps) {
  const { pop } = useNavigation();
  const { data, isLoading } = useData();
  const { value: formLayout, isLoading: isLoadingLayout } = useCreateReminderFormLayout();
  const { value: postCreateActions } = usePostCreateActions();

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

  const submitOptionsRef = useRef<SubmitOptions | undefined>(undefined);

  async function submitReminder(values: CreateReminderValues, options?: SubmitOptions) {
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
      await runPostCreateActions(postCreateActions, "create-form");

      if (options?.closeWindowAfterCreate) {
        await closeMainWindow({ popToRootType: PopToRootType.Immediate });
      }

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
      await submitReminder(values, submitOptionsRef.current);
    },
  });

  async function submitWithOptions(values: CreateReminderValues, options?: SubmitOptions) {
    submitOptionsRef.current = options;

    try {
      await handleSubmit(values);
    } finally {
      submitOptionsRef.current = undefined;
    }
  }

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
  const isFieldEnabled = (fieldId: string) =>
    formLayout.some((item) => item.type === "field" && item.id === fieldId && item.enabled);
  const renderFieldNodes = (fieldId: string) => {
    switch (fieldId) {
      case "title":
        return [<Form.TextField key="title" {...itemProps.title} title="Title" placeholder="New Reminder" />];
      case "list":
        return [
          <Form.Dropdown key="listId" {...itemProps.listId} title="List" storeValue>
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
          </Form.Dropdown>,
        ];
      case "notes":
        return [<Form.TextArea key="notes" {...itemProps.notes} title="Notes" placeholder="Add some notes" />];
      case "dueDate":
        return [<Form.DatePicker key="dueDate" {...itemProps.dueDate} title="Date" />];
      case "recurrence":
        if (!isFieldEnabled("dueDate") || !values.dueDate) {
          return [];
        }

        return [
          <Form.Checkbox key="isRecurring" {...itemProps.isRecurring} label="Is Recurring" />,
          ...(values.isRecurring
            ? [
                <Form.Dropdown key="frequency" {...itemProps.frequency} title="Frequency">
                  <Form.Dropdown.Item title="Daily" value="daily" />
                  <Form.Dropdown.Item title="Weekdays" value="weekdays" />
                  <Form.Dropdown.Item title="Weekends" value="weekends" />
                  <Form.Dropdown.Item title="Weekly" value="weekly" />
                  <Form.Dropdown.Item title="Monthly" value="monthly" />
                  <Form.Dropdown.Item title="Yearly" value="yearly" />
                </Form.Dropdown>,
                <Form.TextField key="interval" {...itemProps.interval} title="Interval" placeholder="1" />,
                <Form.Description key="recurrenceDescription" text={recurrenceDescription} />,
              ]
            : []),
        ];
      case "priority":
        return [
          <Form.Dropdown key="priority" {...itemProps.priority} title="Priority" storeValue>
            <Form.Dropdown.Item title="None" value="" />
            <Form.Dropdown.Item title="High" value="high" icon={getPriorityIcon("high")} />
            <Form.Dropdown.Item title="Medium" value="medium" icon={getPriorityIcon("medium")} />
            <Form.Dropdown.Item title="Low" value="low" icon={getPriorityIcon("low")} />
          </Form.Dropdown>,
        ];
      case "location":
        return [
          ...(hasLocations
            ? [
                <Form.Dropdown key="location" {...itemProps.location} title="Location">
                  <Form.Dropdown.Item title="None" value="" />

                  {locations.map((location) => {
                    return (
                      <Form.Dropdown.Item
                        icon={location.icon}
                        key={location.id}
                        title={location.name}
                        value={location.id}
                      />
                    );
                  })}

                  <Form.Dropdown.Item icon={Icon.Pencil} title="Custom Location" value="custom" />
                </Form.Dropdown>,
              ]
            : []),
          ...(values.location === "custom" || !hasLocations
            ? [
                <Form.TextField key="address" {...itemProps.address} title="Address" placeholder="Enter an address" />,
                <Form.Dropdown
                  key="proximity"
                  {...itemProps.proximity}
                  title="Proximity"
                  info="Whether you want to trigger the reminder when arriving at the place or when leaving it"
                >
                  <Form.Dropdown.Item title="Arriving" value="enter" />
                  <Form.Dropdown.Item title="Leaving" value="leave" />
                </Form.Dropdown>,
                <Form.TextField
                  key="radius"
                  {...itemProps.radius}
                  title="Radius"
                  placeholder="100"
                  info="The minimum distance in meters from the place that would trigger the reminder"
                />,
              ]
            : []),
        ];
      default:
        return [];
    }
  };

  const renderedGroups = formLayout.reduce<ReactElement[][]>(
    (groups, item) => {
      const currentGroup = groups[groups.length - 1];

      if (item.type === "separator") {
        if (currentGroup.length > 0) {
          groups.push([]);
        }
        return groups;
      }

      if (!item.enabled) {
        return groups;
      }

      const nodes = renderFieldNodes(item.id);
      if (nodes.length > 0) {
        currentGroup.push(...nodes);
      }

      return groups;
    },
    [[]],
  );

  const visibleGroups = renderedGroups.filter((group) => group.length > 0);

  return (
    <Form
      isLoading={isLoading || isLoadingLayout}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Plus}
            onSubmit={(values) => submitWithOptions(values as CreateReminderValues)}
            title="Create Reminder"
          />
          <Action.SubmitForm
            icon={Icon.Window}
            onSubmit={(values) => submitWithOptions(values as CreateReminderValues, { closeWindowAfterCreate: true })}
            title="Create Reminder and Close Window"
          />
          <Action.Push
            icon={Icon.Pin}
            title="Add Saved Location"
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            target={<LocationForm onSubmit={addLocationsAndSetValue} />}
          />
          <Action.Push
            icon={Icon.Gear}
            title="Customize Create Reminder Form"
            target={<CustomizeCreateReminderForm />}
          />
          <Action.Push icon={Icon.Bolt} title="Manage Create Actions" target={<ManageCreateActions />} />
        </ActionPanel>
      }
      enableDrafts={!listId}
    >
      {visibleGroups.flatMap((group, index) => [
        ...(index > 0 ? [<Form.Separator key={`separator-${index}`} />] : []),
        ...group,
      ])}
    </Form>
  );
}

export default function Command({ draftValues }: LaunchProps<{ draftValues: CreateReminderValues }>) {
  return <CreateReminderForm draftValues={draftValues} />;
}
