import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  LaunchType,
  List,
  confirmAlert,
  launchCommand,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, FormValidation, useForm } from "@raycast/utils";
import {
  getRecentTimesheets,
  updateTimesheet,
  deleteTimesheet,
  stopTimesheet,
  getProjects,
  getActivities,
  Timesheet,
  Project,
  Activity,
} from "./libs/api";
import { convertToHours } from "./libs/helpers";
import getPreferences from "./libs/preferences";
import dayjs from "dayjs";

const DATE_FORMAT = "YYYY-MM-DDTHH:mm:ss";

const parseDuration = (duration: string): number | null => {
  const match = duration.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (minutes >= 60) return null;
  return hours * 60 + minutes;
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

interface EditFormValues {
  project: string;
  activity: string;
  begin: Date | null;
  end: Date | null;
  duration: string;
  description: string;
}

function EditTimesheetForm({
  timesheet,
  projects,
  activities,
  onEdit,
}: {
  timesheet: Timesheet;
  projects: Project[];
  activities: Activity[];
  onEdit: () => void;
}) {
  const { pop } = useNavigation();

  const durationMinutes = timesheet.end ? Math.round(dayjs(timesheet.end).diff(dayjs(timesheet.begin), "minute")) : 0;

  const { handleSubmit, itemProps, values, setValue } = useForm<EditFormValues>({
    onSubmit: async (formValues) => {
      if (!formValues.begin) {
        showToast({ style: Toast.Style.Failure, title: "Please select start time!" });
        return;
      }

      if (formValues.end && dayjs(formValues.end).isBefore(dayjs(formValues.begin))) {
        showToast({ style: Toast.Style.Failure, title: "End time must be after start time!" });
        return;
      }

      const durationMins = parseDuration(formValues.duration);
      if (formValues.duration && durationMins === null) {
        showToast({ style: Toast.Style.Failure, title: "Invalid duration format!" });
        return;
      }

      try {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Updating time entry..." });
        const begin = dayjs(formValues.begin).set("seconds", 0).format(DATE_FORMAT);
        const end = formValues.end ? dayjs(formValues.end).set("seconds", 0).format(DATE_FORMAT) : null;

        await updateTimesheet(timesheet.id, {
          begin,
          end,
          project: Number(formValues.project),
          activity: Number(formValues.activity),
          description: formValues.description,
        });

        toast.hide();
        await showHUD("Time entry updated!");
        onEdit();
        pop();

        try {
          await launchCommand({ name: "logged-hours", type: LaunchType.Background });
        } catch {
          // ignore
        }
      } catch (err) {
        await showToast({ style: Toast.Style.Failure, title: "Update failed!", message: String(err) });
      }
    },
    validation: {
      project: FormValidation.Required,
      activity: FormValidation.Required,
      begin: (value) => {
        if (!value) return "Please select start time!";
      },
      duration: (value) => {
        if (!value) return undefined;
        const minutes = parseDuration(value);
        if (minutes === null) return "Use HH:MM format (e.g., 08:00)";
        if (minutes < 0) return "Duration cannot be negative!";
      },
    },
    initialValues: {
      project: String(timesheet.project),
      activity: String(timesheet.activity),
      begin: new Date(timesheet.begin),
      end: timesheet.end ? new Date(timesheet.end) : null,
      duration: formatDuration(durationMinutes),
      description: timesheet.description || "",
    },
  });

  const handleBeginChange = (date: Date | null) => {
    setValue("begin", date);
    if (date && values.end) {
      const minutes = Math.round(dayjs(values.end).diff(dayjs(date), "minute"));
      if (minutes >= 0) {
        setValue("duration", formatDuration(minutes));
      }
    }
  };

  const handleEndChange = (date: Date | null) => {
    setValue("end", date);
    if (date && values.begin) {
      const minutes = Math.round(dayjs(date).diff(dayjs(values.begin), "minute"));
      if (minutes >= 0) {
        setValue("duration", formatDuration(minutes));
      }
    }
  };

  const handleDurationChange = (duration: string) => {
    setValue("duration", duration);
    const minutes = parseDuration(duration);
    if (minutes !== null && values.begin) {
      const newEnd = dayjs(values.begin).add(minutes, "minute").toDate();
      setValue("end", newEnd);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        title="Start Time"
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.begin}
        onChange={handleBeginChange}
      />
      <Form.DatePicker
        title="End Time"
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.end}
        onChange={handleEndChange}
        info="Leave empty to keep timer running"
      />
      <Form.TextField
        title="Duration"
        placeholder="HH:MM"
        info="Format: HH:MM (e.g., 08:00 for 8 hours)"
        {...itemProps.duration}
        onChange={handleDurationChange}
      />
      <Form.Dropdown title="Project" {...itemProps.project}>
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={String(p.id)} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Activity" {...itemProps.activity}>
        {activities
          .filter((a) => !a.project || String(a.project) === values.project)
          .map((a) => (
            <Form.Dropdown.Item key={a.id} value={String(a.id)} title={a.name} />
          ))}
      </Form.Dropdown>
      <Form.TextArea title="Description" {...itemProps.description} />
    </Form>
  );
}

function TimesheetListItem({
  timesheet,
  projects,
  activities,
  onRefresh,
}: {
  timesheet: Timesheet;
  projects: Project[];
  activities: Activity[];
  onRefresh: () => void;
}) {
  const project = projects.find((p) => p.id === timesheet.project);
  const activity = activities.find((a) => a.id === timesheet.activity);
  const isRunning = timesheet.end === null;

  const duration = isRunning
    ? convertToHours(dayjs().diff(dayjs(timesheet.begin), "second"))
    : convertToHours(timesheet.duration);

  const handleStop = async () => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Stopping timer..." });
      await stopTimesheet(timesheet.id);
      await showHUD("Timer stopped!");
      onRefresh();
      try {
        await launchCommand({ name: "logged-hours", type: LaunchType.Background });
      } catch {
        // ignore
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop timer",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Time Entry",
      message: "Are you sure you want to delete this time entry?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting..." });
        await deleteTimesheet(timesheet.id);
        await showHUD("Time entry deleted!");
        onRefresh();
        try {
          await launchCommand({ name: "logged-hours", type: LaunchType.Background });
        } catch {
          // ignore
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const accessories: List.Item.Accessory[] = [
    ...(isRunning ? [{ tag: { value: "Running", color: Color.Green } }] : []),
    { icon: Icon.Clock },
    { text: duration },
  ];

  return (
    <List.Item
      icon={isRunning ? { source: Icon.Clock, tintColor: Color.Green } : Icon.Calendar}
      title={project?.name || `Project #${timesheet.project}`}
      subtitle={activity?.name || `Activity #${timesheet.activity}`}
      accessories={accessories}
      keywords={[
        project?.name || "",
        activity?.name || "",
        timesheet.description || "",
        dayjs(timesheet.begin).format("YYYY-MM-DD"),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Edit Time Entry"
              icon={Icon.Pencil}
              target={
                <EditTimesheetForm
                  timesheet={timesheet}
                  projects={projects}
                  activities={activities}
                  onEdit={onRefresh}
                />
              }
            />
            {isRunning && <Action title="Stop Timer" icon={Icon.Stop} onAction={handleStop} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Time Entry"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={handleDelete}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function TimesheetsCommand() {
  const { email, password, token } = getPreferences();
  const validPreferences = Boolean((email && password) || token);

  const {
    data: timesheets,
    isLoading: isLoadingTimesheets,
    revalidate,
  } = useCachedPromise(() => getRecentTimesheets(14), [], {
    keepPreviousData: true,
  });

  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(getProjects, [], {
    keepPreviousData: true,
  });

  const { data: activities, isLoading: isLoadingActivities } = useCachedPromise(getActivities, [], {
    keepPreviousData: true,
  });

  const isLoading = isLoadingTimesheets || isLoadingProjects || isLoadingActivities;

  if (!validPreferences) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          title="Please set your API token or your email and password in the preferences"
        />
      </List>
    );
  }

  const runningTimesheets = timesheets?.filter((t) => t.end === null) || [];
  const completedTimesheets = timesheets?.filter((t) => t.end !== null) || [];

  const groupedByDate = completedTimesheets.reduce(
    (acc, ts) => {
      const date = dayjs(ts.begin).format("YYYY-MM-DD");
      if (!acc[date]) acc[date] = [];
      acc[date].push(ts);
      return acc;
    },
    {} as Record<string, Timesheet[]>,
  );

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => (dayjs(b).isAfter(dayjs(a)) ? 1 : -1));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search time entries...">
      {runningTimesheets.length > 0 && (
        <List.Section title="Running" subtitle={`${runningTimesheets.length} active`}>
          {runningTimesheets.map((ts) => (
            <TimesheetListItem
              key={ts.id}
              timesheet={ts}
              projects={projects || []}
              activities={activities || []}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}
      {sortedDates.map((date) => {
        const dateTimesheets = groupedByDate[date];
        const totalSeconds = dateTimesheets.reduce((sum, ts) => sum + ts.duration, 0);
        const totalHours = convertToHours(totalSeconds);
        const formattedDate = dayjs(date).format("ddd, MMM D");

        return (
          <List.Section key={date} title={formattedDate} subtitle={`${totalHours} total`}>
            {dateTimesheets.map((ts) => (
              <TimesheetListItem
                key={ts.id}
                timesheet={ts}
                projects={projects || []}
                activities={activities || []}
                onRefresh={revalidate}
              />
            ))}
          </List.Section>
        );
      })}
      {!isLoading && timesheets?.length === 0 && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No time entries found"
          description="Start tracking time to see entries here"
        />
      )}
    </List>
  );
}
