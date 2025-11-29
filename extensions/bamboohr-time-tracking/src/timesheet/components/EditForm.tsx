import {
  ActionPanel,
  Action,
  Form,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import React, { useState, useMemo } from "react";
import {
  NormalizedTimeEntry,
  Project,
  TimesheetEntryInput,
  formatDuration,
} from "../../bamboo/api";
import { useNavigation } from "@raycast/api";
import { Preferences } from "../../preferences";

type DayEntry = {
  id: string; // Unique ID for form management
  originalEntry?: NormalizedTimeEntry; // If editing existing entry
  start: Date | null;
  end: Date | null;
  note: string;
  projectId: string;
  isNew: boolean;
};

type EditMode = "edit" | "split" | "add" | "editDay";

type EditFormProps = {
  mode: EditMode;
  date: string; // YYYY-MM-DD format
  existingEntries: NormalizedTimeEntry[];
  projects: Project[];
  projectsLoading?: boolean;
  preferences: Preferences;
  // Optional props for specific modes
  targetEntry?: NormalizedTimeEntry; // For edit/split modes
  splitGapMs?: number; // For split mode
  onSave: (data: {
    toCreate: TimesheetEntryInput[];
    toUpdate: { id: string; input: TimesheetEntryInput }[];
    toDelete: string[];
  }) => Promise<void>;
};

function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function setTimeOnDate(date: Date, hours: number, minutes: number): Date {
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

function createSplitEntries(
  originalEntry: NormalizedTimeEntry,
  splitGapMs: number,
  preferences: Preferences,
): { firstEntry: DayEntry; secondEntry: DayEntry } {
  const splitMode = preferences.splitMode || "afterMaxHours";

  let firstEnd: Date;
  let secondStart: Date;

  if (splitMode === "customTimes" && originalEntry.start) {
    const endTime = parseTime(preferences.customSplitEndTime || "12:00");
    const startTime = parseTime(preferences.customSplitStartTime || "13:00");

    if (endTime && startTime) {
      firstEnd = setTimeOnDate(
        originalEntry.start,
        endTime.hours,
        endTime.minutes,
      );
      secondStart = setTimeOnDate(
        originalEntry.start,
        startTime.hours,
        startTime.minutes,
      );
    } else {
      // Fall back to simple split
      const totalMs =
        (originalEntry.end?.getTime() || 0) -
        (originalEntry.start?.getTime() || 0);
      const gap = splitGapMs || 30 * 60 * 1000;
      const midPoint =
        (originalEntry.start?.getTime() || 0) + Math.floor((totalMs - gap) / 2);
      firstEnd = new Date(midPoint);
      secondStart = new Date(midPoint + gap);
    }
  } else {
    // After max hours mode
    const maxHours = parseInt(preferences.maxWorkHours || "6", 10);
    const maxHoursMs = maxHours * 60 * 60 * 1000;
    firstEnd = new Date((originalEntry.start?.getTime() || 0) + maxHoursMs);
    secondStart = new Date(firstEnd.getTime() + (splitGapMs || 30 * 60 * 1000));
  }

  const firstEntry: DayEntry = {
    id: `split-first-${Date.now()}`,
    originalEntry,
    start: originalEntry.start || null,
    end: firstEnd,
    note: originalEntry.note || "",
    projectId: originalEntry.projectId || "",
    isNew: false,
  };

  const secondEntry: DayEntry = {
    id: `split-second-${Date.now()}`,
    start: secondStart,
    end: originalEntry.end || null,
    note: originalEntry.note || "",
    projectId: originalEntry.projectId || "",
    isNew: true,
  };

  return { firstEntry, secondEntry };
}

function calculateSmartDefaults(
  entries: NormalizedTimeEntry[],
  preferences: Preferences,
): { startTime: Date | null; projectId: string } {
  const sortedEntries = entries
    .filter((e) => e.end)
    .sort((a, b) => (a.end?.getTime() || 0) - (b.end?.getTime() || 0));

  if (sortedEntries.length > 0) {
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    if (lastEntry.end) {
      const pauseMinutes = parseInt(
        preferences.defaultPauseDuration || "30",
        10,
      );
      const pauseMs = pauseMinutes * 60 * 1000;
      return {
        startTime: new Date(lastEntry.end.getTime() + pauseMs),
        projectId: lastEntry.projectId || "",
      };
    }
  }

  return { startTime: null, projectId: "" };
}

export function EditForm({
  mode,
  date,
  existingEntries,
  projects,
  projectsLoading,
  preferences,
  targetEntry,
  splitGapMs = 30 * 60 * 1000,
  onSave,
}: EditFormProps) {
  const { pop } = useNavigation();

  // Initialize entries based on mode
  const [entries, setEntries] = useState<DayEntry[]>(() => {
    let initialEntries: DayEntry[] = [];

    // Convert existing entries to DayEntry format
    const existingDayEntries: DayEntry[] = existingEntries.map(
      (entry, index) => ({
        id: `existing-${index}`,
        originalEntry: entry,
        start: entry.start || null,
        end: entry.end || null,
        note: entry.note || "",
        projectId: entry.projectId || "",
        isNew: false,
      }),
    );

    switch (mode) {
      case "edit":
        initialEntries = existingDayEntries;
        break;

      case "split":
        if (targetEntry) {
          // Replace target entry with split entries
          const { firstEntry, secondEntry } = createSplitEntries(
            targetEntry,
            splitGapMs,
            preferences,
          );
          initialEntries = existingDayEntries
            .filter((e) => e.originalEntry?.id !== targetEntry.id)
            .concat([firstEntry, secondEntry])
            .sort(
              (a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0),
            );
        } else {
          initialEntries = existingDayEntries;
        }
        break;

      case "add":
        {
          const { startTime, projectId } = calculateSmartDefaults(
            existingEntries,
            preferences,
          );
          initialEntries = [
            ...existingDayEntries,
            {
              id: `new-${Date.now()}`,
              start: startTime,
              end: null,
              note: "",
              projectId,
              isNew: true,
            },
          ];
        }
        break;

      case "editDay":
      default:
        initialEntries = existingDayEntries;
        // Add one empty entry if no existing entries
        if (initialEntries.length === 0) {
          initialEntries.push({
            id: `new-${Date.now()}`,
            start: null,
            end: null,
            note: "",
            projectId: "",
            isNew: true,
          });
        }
        break;
    }

    return initialEntries;
  });

  // Format date for display
  const formattedDate = useMemo(() => {
    return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [date]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    const totalMs = entries.reduce((total, entry) => {
      if (entry.start && entry.end) {
        return total + (entry.end.getTime() - entry.start.getTime());
      }
      return total;
    }, 0);
    return formatDuration(totalMs);
  }, [entries]);

  const updateEntry = (id: string, updates: Partial<DayEntry>) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
    );
  };

  const addEntry = () => {
    // Calculate smart defaults based on current entries with end times
    const currentEntriesWithEnd = entries
      .filter((e) => e.end)
      .map(
        (e) =>
          ({
            ...e.originalEntry,
            start: e.start,
            end: e.end,
            projectId: e.projectId,
          }) as NormalizedTimeEntry,
      );

    const { startTime, projectId } = calculateSmartDefaults(
      currentEntriesWithEnd,
      preferences,
    );

    const newEntry: DayEntry = {
      id: `new-${Date.now()}`,
      start: startTime,
      end: null,
      note: "",
      projectId,
      isNew: true,
    };
    setEntries((prev) => [...prev, newEntry]);
  };

  const removeLastEntry = () => {
    if (entries.length > 1) {
      setEntries((prev) => prev.slice(0, -1));
    }
  };

  // Validation function to check for overlaps
  const validateEntries = () => {
    const validEntries = entries.filter((e) => e.start && e.end);

    for (let i = 0; i < validEntries.length; i++) {
      for (let j = i + 1; j < validEntries.length; j++) {
        const entryA = validEntries[i];
        const entryB = validEntries[j];

        const startA = entryA.start!.getTime();
        const endA = entryA.end!.getTime();
        const startB = entryB.start!.getTime();
        const endB = entryB.end!.getTime();

        // Check for overlap: A starts before B ends AND B starts before A ends
        if (startA < endB && startB < endA) {
          return {
            hasOverlap: true,
            message: `Time overlap detected between entries at ${entryA.start!.toLocaleTimeString()} and ${entryB.start!.toLocaleTimeString()}`,
          };
        }
      }
    }

    return { hasOverlap: false, message: "" };
  };

  const handleSubmit = async () => {
    // Validate for overlaps
    const validation = validateEntries();
    if (validation.hasOverlap) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot save entries",
        message: validation.message,
      });
      return;
    }

    const toCreate: TimesheetEntryInput[] = [];
    const toUpdate: { id: string; input: TimesheetEntryInput }[] = [];
    const toDelete: string[] = [];

    // Process entries
    for (const entry of entries) {
      // Skip entries without start time
      if (!entry.start) continue;

      const input: TimesheetEntryInput = {
        start: entry.start,
        end: entry.end || undefined,
        note: entry.note.trim() || undefined,
        projectId: entry.projectId.trim() || undefined,
      };

      if (entry.isNew) {
        toCreate.push(input);
      } else if (entry.originalEntry?.id) {
        toUpdate.push({ id: entry.originalEntry.id, input });
      }
    }

    // Find entries to delete (original entries not present in current entries)
    const currentOriginalIds = new Set(
      entries
        .filter((e) => e.originalEntry?.id)
        .map((e) => e.originalEntry!.id!),
    );

    for (const originalEntry of existingEntries) {
      if (originalEntry.id && !currentOriginalIds.has(originalEntry.id)) {
        toDelete.push(originalEntry.id);
      }
    }

    try {
      await onSave({ toCreate, toUpdate, toDelete });
      pop();
    } catch {
      // Error already handled by onSave, just prevent form from closing
    }
  };

  const getNavigationTitle = () => {
    switch (mode) {
      case "edit":
        return "Edit Entry";
      case "split":
        return "Split Entry";
      case "add":
        return "Add Entry";
      case "editDay":
        return "Edit Day";
      default:
        return "Edit Day";
    }
  };

  return (
    <Form
      navigationTitle={getNavigationTitle()}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={() => void handleSubmit()}
          />
          {mode !== "edit" && (
            <Action
              title="Add Entry"
              icon={Icon.Plus}
              onAction={addEntry}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "n" },
                Windows: { modifiers: ["ctrl"], key: "n" },
              }}
            />
          )}
          {entries.length > 1 && (
            <Action
              title="Remove Entry"
              icon={Icon.Minus}
              onAction={removeLastEntry}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "backspace" },
                Windows: { modifiers: ["ctrl"], key: "backspace" },
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title={formattedDate}
        text={`Total Duration: ${totalDuration}${mode !== "edit" ? ` • ${entries.length} entries` : ""}`}
      />

      {entries.map((entry, index) => {
        return (
          <React.Fragment key={entry.id}>
            <Form.DatePicker
              id={`${entry.id}-start`}
              title="Start Time"
              type={Form.DatePicker.Type.DateTime}
              value={entry.start}
              onChange={(date) =>
                updateEntry(entry.id, { start: date || null })
              }
              autoFocus={mode === "add" && entry.isNew}
            />
            <Form.DatePicker
              id={`${entry.id}-end`}
              title="End Time"
              type={Form.DatePicker.Type.DateTime}
              value={entry.end}
              onChange={(date) => updateEntry(entry.id, { end: date || null })}
            />
            <Form.TextArea
              id={`${entry.id}-note`}
              title="Note"
              placeholder="Optional note"
              value={entry.note}
              onChange={(note) => updateEntry(entry.id, { note })}
            />
            <Form.Dropdown
              id={`${entry.id}-project`}
              title="Project"
              value={entry.projectId}
              onChange={(projectId) => updateEntry(entry.id, { projectId })}
              isLoading={projectsLoading}
            >
              <Form.Dropdown.Item value="" title="None" />
              {projects?.map((project) => (
                <Form.Dropdown.Item
                  key={project.id}
                  value={project.id}
                  title={project.name}
                />
              ))}
            </Form.Dropdown>

            {/* Separator between entries */}
            {index < entries.length - 1 && <Form.Separator />}
          </React.Fragment>
        );
      })}
    </Form>
  );
}
