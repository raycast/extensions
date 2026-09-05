import {
  Action,
  ActionPanel,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import {
  BUILT_IN_CATEGORIES,
  isBuiltInCategory,
  WEEKDAYS,
} from "../lib/categories";
import { loadAllCategoryOptions } from "../lib/raycast-categories";
import {
  isValidTime,
  isWithinWindow,
  remainingDurationSeconds,
  windowDurationSeconds,
} from "../lib/schedule";
import { clearScheduleStartMarker, upsertSchedule } from "../lib/storage";
import {
  FocusMode,
  FocusSchedule,
  ScheduleFormValues,
  Weekday,
} from "../lib/types";

type ScheduleFormProps = {
  schedule?: FocusSchedule;
};

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ScheduleForm({ schedule }: ScheduleFormProps) {
  const isEditing = Boolean(schedule);
  const {
    data: categoryOptions = BUILT_IN_CATEGORIES,
    isLoading: isLoadingCategories,
    revalidate: revalidateCategories,
  } = useCachedPromise(loadAllCategoryOptions);

  const { handleSubmit, itemProps, values } = useForm<ScheduleFormValues>({
    initialValues: {
      name: schedule?.name ?? "",
      days: schedule?.days.map(String) ?? ["1", "2", "3", "4", "5"],
      startTime: schedule?.startTime ?? "09:00",
      endTime: schedule?.endTime ?? "12:00",
      goal: schedule?.goal ?? "",
      mode: schedule?.mode ?? "block",
      categories: schedule?.categories ?? [],
      enabled: schedule?.enabled ?? true,
    },
    validation: {
      name: FormValidation.Required,
      days: (value) => {
        if (!value || value.length === 0) return "Select at least one day";
      },
      startTime: (value) => {
        if (!value) return "Start time is required";
        if (!isValidTime(value)) return "Use 24h format HH:mm (e.g. 09:00)";
      },
      endTime: (value) => {
        if (!value) return "End time is required";
        if (!isValidTime(value)) return "Use 24h format HH:mm (e.g. 12:00)";
      },
      categories: (value) => {
        if (!value || value.length === 0) return "Select at least one category";
      },
    },
    async onSubmit(formValues) {
      const days = formValues.days.map((d) => Number(d) as Weekday);
      const uniqueCategories = [...new Set(formValues.categories)];

      const timestamp = new Date().toISOString();
      const next: FocusSchedule = {
        id: schedule?.id ?? generateId(),
        name: formValues.name.trim(),
        days,
        startTime: formValues.startTime.trim(),
        endTime: formValues.endTime.trim(),
        goal: formValues.goal.trim() || formValues.name.trim(),
        mode: formValues.mode as FocusMode,
        categories: uniqueCategories,
        enabled: formValues.enabled,
        createdAt: schedule?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };

      await upsertSchedule(next);

      // If we're already inside the window, start immediately via the checker
      const now = new Date();
      const shouldAutoStart =
        next.enabled &&
        isWithinWindow(next.startTime, next.endTime, now) &&
        remainingDurationSeconds(next.startTime, next.endTime, now) >= 60;

      if (shouldAutoStart) {
        await clearScheduleStartMarker(next.id);
      }

      try {
        // First run also enables background refresh for Check Focus Schedules
        await launchCommand({
          name: "check-schedules",
          type: LaunchType.UserInitiated,
        });
      } catch (error) {
        console.error(
          "Focus Scheduler: could not launch check-schedules",
          error,
        );
      }

      await showToast({
        style: Toast.Style.Success,
        title: isEditing ? "Schedule updated" : "Schedule created",
        message: shouldAutoStart
          ? `${next.name} · starting now until ${next.endTime}`
          : `${next.name} · ${next.startTime}–${next.endTime}`,
      });
      await popToRoot({ clearSearchBar: true });
    },
  });

  const previewNow = new Date();
  const inWindow =
    isValidTime(values.startTime ?? "") &&
    isValidTime(values.endTime ?? "") &&
    isWithinWindow(values.startTime, values.endTime, previewNow);
  const remainingMinutes = inWindow
    ? Math.round(
        remainingDurationSeconds(values.startTime, values.endTime, previewNow) /
          60,
      )
    : null;

  const durationPreview =
    isValidTime(values.startTime ?? "") && isValidTime(values.endTime ?? "")
      ? values.startTime === values.endTime
        ? "All day (24 hours)"
        : inWindow && remainingMinutes !== null
          ? `Window ${Math.round(windowDurationSeconds(values.startTime, values.endTime) / 60)}m · ${remainingMinutes}m left if started now`
          : `${Math.round(windowDurationSeconds(values.startTime, values.endTime) / 60)} minutes`
      : null;

  const customOptions = categoryOptions.filter(
    (c) => c.kind === "custom" || !isBuiltInCategory(c.id),
  );
  const builtinOptions = categoryOptions.filter((c) => isBuiltInCategory(c.id));
  const hasCustom = customOptions.length > 0;

  return (
    <Form
      isLoading={isLoadingCategories}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Schedule" : "Create Schedule"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          <Action
            title="Refresh Categories"
            icon={Icon.ArrowClockwise}
            onAction={revalidateCategories}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Automatic start"
        text="Saving runs Check Focus Schedules immediately (and enables background refresh). While the window is active, Focus starts with the time remaining until End — e.g. 13:30–17:30 started at 15:30 → 2h."
      />

      <Form.TextField
        title="Name"
        placeholder="Deep Work Morning"
        {...itemProps.name}
      />
      <Form.TextField
        title="Goal"
        placeholder="Write the report"
        info="Shown in the Focus session"
        {...itemProps.goal}
      />

      <Form.TagPicker title="Days" {...itemProps.days}>
        {WEEKDAYS.map((day) => (
          <Form.TagPicker.Item
            key={day.id}
            value={day.id}
            title={day.title}
            icon={Icon.Calendar}
          />
        ))}
      </Form.TagPicker>

      <Form.TextField
        title="Start time"
        placeholder="09:00"
        info="24-hour format (HH:mm)"
        {...itemProps.startTime}
      />
      <Form.TextField
        title="End time"
        placeholder="12:00"
        info="Supports overnight windows (e.g. 22:00 → 06:00). Same as start = all day."
        {...itemProps.endTime}
      />

      {durationPreview !== null && (
        <Form.Description title="Duration" text={durationPreview} />
      )}

      <Form.Dropdown title="Mode" {...itemProps.mode}>
        <Form.Dropdown.Item
          value="block"
          title="Block apps & websites"
          icon={Icon.EyeDisabled}
        />
        <Form.Dropdown.Item
          value="allow"
          title="Allow only selected"
          icon={Icon.Eye}
        />
      </Form.Dropdown>

      {!hasCustom && (
        <Form.Description
          title="Your Focus Categories"
          text="No custom categories synced yet. Run “Sync Focus Categories”, or set a JSON export file in Extension Preferences — then they show up in the list below."
        />
      )}

      <Form.TagPicker
        title="Categories"
        info="Custom Focus Categories appear first (★), then built-ins"
        {...itemProps.categories}
      >
        {customOptions.map((category) => (
          <Form.TagPicker.Item
            key={`custom-${category.id}`}
            value={category.id}
            title={category.title}
            icon={Icon.Star}
          />
        ))}
        {builtinOptions.map((category) => (
          <Form.TagPicker.Item
            key={`builtin-${category.id}`}
            value={category.id}
            title={category.title}
            icon={Icon.Tag}
          />
        ))}
      </Form.TagPicker>

      <Form.Checkbox
        title="Enabled"
        label="Run this schedule automatically"
        {...itemProps.enabled}
      />
    </Form>
  );
}
