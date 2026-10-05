import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  useNavigation,
} from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import {
  CreateTaskInput,
  TweekCalendar,
  TweekCustomColor,
  TweekTask,
  UpdateTaskInput,
  UpdateType,
} from "../types";
import { parseISODate, toISODateString } from "../utils/date-utils";
import {
  BUILT_IN_COLORS,
  isRecurringTask,
  RECURRENCE_LABELS,
} from "../utils/format-task";

export interface TaskFormProps {
  mode: "create" | "edit";
  initialTask?: TweekTask;
  initialTitle?: string;
  calendars: TweekCalendar[];
  defaultCalendarId: string;
  customColors: TweekCustomColor[];
  onSubmitCreate?: (input: CreateTaskInput) => Promise<unknown>;
  onSubmitBulkCreate?: (inputs: CreateTaskInput[]) => Promise<unknown>;
  onSubmitEdit?: (
    taskId: string,
    updates: UpdateTaskInput & { originalCalendarId?: string },
    updateType?: UpdateType,
  ) => Promise<unknown>;
}

export function TaskForm({
  mode,
  initialTask,
  initialTitle = "",
  calendars,
  defaultCalendarId,
  customColors,
  onSubmitCreate,
  onSubmitBulkCreate,
  onSubmitEdit,
}: TaskFormProps) {
  const { pop } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();

  const [title, setTitle] = useState<string>(initialTask?.text || initialTitle);
  const [titleError, setTitleError] = useState<string | undefined>();

  const [selectedCalendarId, setSelectedCalendarId] = useState<string>(
    initialTask?.calendarId || defaultCalendarId || calendars[0]?.id || "",
  );

  useEffect(() => {
    if (!selectedCalendarId && (defaultCalendarId || calendars[0]?.id)) {
      const nextCalId = defaultCalendarId || calendars[0]?.id || "";
      setSelectedCalendarId(nextCalId);
      const nextCal = calendars.find((c) => c.id === nextCalId) || calendars[0];
      if (!selectedListId && nextCal?.lists?.[0]?.id) {
        setSelectedListId(nextCal.lists[0].id);
      }
    }
  }, [calendars, defaultCalendarId, selectedCalendarId]);

  const [placementType, setPlacementType] = useState<"dated" | "someday">(
    initialTask && !initialTask.date && initialTask.listId
      ? "someday"
      : "dated",
  );

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialTask?.date ? parseISODate(initialTask.date) : new Date(),
  );

  const selectedCalendarObj = useMemo(
    () => calendars.find((c) => c.id === selectedCalendarId) || calendars[0],
    [calendars, selectedCalendarId],
  );

  const [selectedListId, setSelectedListId] = useState<string>(
    initialTask?.listId || selectedCalendarObj?.lists?.[0]?.id || "",
  );

  const [color, setColor] = useState<string>(
    initialTask?.color || prefs.defaultTaskColor || "blank",
  );

  const [freq, setFreq] = useState<string>(
    initialTask?.freq ? String(initialTask.freq) : "0",
  );

  const [note, setNote] = useState<string>(initialTask?.note || "");

  const [subtasksText, setSubtasksText] = useState<string>(() => {
    if (!initialTask?.checklist || initialTask.checklist.length === 0)
      return "";
    return initialTask.checklist
      .map((item) => `${item.done ? "[x] " : ""}${item.text}`)
      .join("\n");
  });

  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [updateType, setUpdateType] = useState<UpdateType>("only_this");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const recurring = initialTask ? isRecurringTask(initialTask) : false;

  const validateTitle = (value: string): boolean => {
    if (!value.trim()) {
      setTitleError("Task title is required");
      return false;
    }
    setTitleError(undefined);
    return true;
  };

  const parseChecklistLines = (raw: string) => {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return undefined;

    return lines.map((line, idx) => {
      const isDone = /^\[x\]\s*/i.test(line);
      const cleanLine = line.replace(/^\[[ xX]\]\s*/, "").trim();
      return {
        id: initialTask?.checklist?.[idx]?.id || `sub_${Date.now()}_${idx}`,
        text: cleanLine,
        done: isDone,
      };
    });
  };

  const handleSubmit = async () => {
    if (!validateTitle(title)) return;
    if (!selectedCalendarId) {
      setTitleError("Please select a calendar first");
      return;
    }

    setIsSubmitting(true);
    try {
      const isoDate =
        placementType === "dated" && selectedDate
          ? toISODateString(selectedDate)
          : null;
      const listId =
        placementType === "someday" && selectedListId ? selectedListId : null;
      const numericFreq = Number(freq) || 0;
      const parsedChecklist = parseChecklistLines(subtasksText);

      if (mode === "create") {
        if (isBulkMode && onSubmitBulkCreate) {
          const titles = title
            .split("\n")
            .map((t) => t.trim())
            .filter(Boolean);
          const bulkItems: CreateTaskInput[] = titles.map((t) => ({
            calendarId: selectedCalendarId,
            text: t,
            date: isoDate,
            listId,
            color,
            note: note.trim() || undefined,
            freq: numericFreq > 0 ? numericFreq : undefined,
            dtStart: numericFreq > 0 && isoDate ? isoDate : undefined,
          }));
          await onSubmitBulkCreate(bulkItems);
        } else if (onSubmitCreate) {
          await onSubmitCreate({
            calendarId: selectedCalendarId,
            text: title.trim(),
            date: isoDate,
            listId,
            color,
            note: note.trim() || undefined,
            checklist: parsedChecklist,
            freq: numericFreq > 0 ? numericFreq : undefined,
            dtStart: numericFreq > 0 && isoDate ? isoDate : undefined,
          });
        }
      } else if (mode === "edit" && initialTask && onSubmitEdit) {
        const hadChecklist = Boolean(
          initialTask.checklist && initialTask.checklist.length > 0,
        );
        const hadRecurrence = Boolean(initialTask.freq && initialTask.freq > 0);

        await onSubmitEdit(
          initialTask.id,
          {
            originalCalendarId: initialTask.calendarId,
            calendarId: selectedCalendarId,
            text: title.trim(),
            date: isoDate,
            listId,
            color,
            note: note.trim() || null,
            checklist: parsedChecklist ?? (hadChecklist ? [] : undefined),
            freq: numericFreq > 0 ? numericFreq : hadRecurrence ? 0 : undefined,
            dtStart:
              numericFreq > 0 && isoDate
                ? isoDate
                : hadRecurrence
                  ? null
                  : undefined,
          },
          recurring ? updateType : undefined,
        );
      }

      pop();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={
        mode === "create" ? "Create Tweek Task" : `Edit: ${initialTask?.text}`
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              mode === "create"
                ? isBulkMode
                  ? "Bulk Create Tasks"
                  : "Create Task"
                : "Save Changes"
            }
            icon={mode === "create" ? Icon.Plus : Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {mode === "create" && onSubmitBulkCreate && (
        <Form.Checkbox
          id="bulkMode"
          label="Bulk Add Mode (one task per line)"
          value={isBulkMode}
          onChange={setIsBulkMode}
        />
      )}

      {isBulkMode ? (
        <Form.TextArea
          id="title"
          title="Task Titles (1 per line)"
          placeholder={
            "Review Q3 metrics\nSend product roadmap\nPrepare sprint retro"
          }
          value={title}
          error={titleError}
          onChange={(v) => {
            setTitle(v);
            if (titleError) validateTitle(v);
          }}
        />
      ) : (
        <Form.TextField
          id="title"
          title="Task Title"
          placeholder="What needs to be done?"
          value={title}
          error={titleError}
          onChange={(v) => {
            setTitle(v);
            if (titleError) validateTitle(v);
          }}
          onBlur={(e) => validateTitle(e.target.value || "")}
        />
      )}

      <Form.Dropdown
        id="calendarId"
        title="Calendar"
        value={selectedCalendarId}
        onChange={(calId) => {
          setSelectedCalendarId(calId);
          const cal = calendars.find((c) => c.id === calId);
          if (cal?.lists?.[0]) {
            setSelectedListId(cal.lists[0].id);
          } else {
            setPlacementType("dated");
          }
        }}
      >
        {calendars.map((cal) => (
          <Form.Dropdown.Item
            key={cal.id}
            value={cal.id}
            title={`${cal.name}${cal.isDefault ? " (Default)" : ""}`}
            icon={Icon.Calendar}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="placementType"
        title="Placement"
        value={placementType}
        onChange={(v) => setPlacementType(v as "dated" | "someday")}
      >
        <Form.Dropdown.Item
          value="dated"
          title="Scheduled on Date"
          icon={Icon.Calendar}
        />
        {selectedCalendarObj?.lists && selectedCalendarObj.lists.length > 0 && (
          <Form.Dropdown.Item
            value="someday"
            title="Someday List (Undated)"
            icon={Icon.Tray}
          />
        )}
      </Form.Dropdown>

      {placementType === "dated" ? (
        <Form.DatePicker
          id="date"
          title="Date"
          type={Form.DatePicker.Type.Date}
          value={selectedDate}
          onChange={setSelectedDate}
        />
      ) : (
        <Form.Dropdown
          id="listId"
          title="Someday List"
          value={selectedListId}
          onChange={setSelectedListId}
        >
          {(selectedCalendarObj?.lists || []).map((list) => (
            <Form.Dropdown.Item
              key={list.id}
              value={list.id}
              title={list.name}
              icon={Icon.List}
            />
          ))}
        </Form.Dropdown>
      )}

      <Form.Dropdown
        id="color"
        title="Color Badge"
        value={color}
        onChange={setColor}
      >
        {Object.values(BUILT_IN_COLORS).map((c) => (
          <Form.Dropdown.Item
            key={c.id}
            value={c.id}
            title={`${c.label}${c.isFreePlanSupported ? "" : " (Pro)"}`}
            icon={{ source: Icon.CircleFilled, tintColor: c.raycastColor }}
          />
        ))}
        {customColors.map((cc) => (
          <Form.Dropdown.Item
            key={cc.id}
            value={cc.id}
            title={`Custom: ${cc.name || cc.backgroundColor} (Pro)`}
            icon={{ source: Icon.CircleFilled, tintColor: cc.backgroundColor }}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="freq"
        title="Repeat / Recurrence"
        value={freq}
        onChange={setFreq}
      >
        {Object.entries(RECURRENCE_LABELS)
          .filter(([k]) => Number(k) <= 6)
          .map(([k, label]) => (
            <Form.Dropdown.Item
              key={k}
              value={k}
              title={`${label}${Number(k) > 0 ? " (Pro)" : ""}`}
              icon={Number(k) > 0 ? Icon.Repeat : Icon.Minus}
            />
          ))}
      </Form.Dropdown>

      {mode === "edit" && recurring && (
        <Form.Dropdown
          id="updateType"
          title="Recurring Update Scope"
          value={updateType}
          onChange={(v) => setUpdateType(v as UpdateType)}
        >
          <Form.Dropdown.Item
            value="only_this"
            title="Only This Occurrence (only_this)"
            icon={Icon.Dot}
          />
          <Form.Dropdown.Item
            value="this_and_future"
            title="This and Future Occurrences (this_and_future)"
            icon={Icon.ArrowRight}
          />
          <Form.Dropdown.Item
            value="all_linked"
            title="All Linked Occurrences (all_linked)"
            icon={Icon.Repeat}
          />
        </Form.Dropdown>
      )}

      <Form.Separator />

      <Form.TextArea
        id="note"
        title="Markdown Note"
        placeholder="Add optional notes, links, or markdown details..."
        value={note}
        onChange={setNote}
      />

      {!isBulkMode && (
        <Form.TextArea
          id="subtasks"
          title="Subtasks / Checklist (Pro)"
          placeholder={"[ ] Draft outline\n[x] Review metrics"}
          value={subtasksText}
          onChange={setSubtasksText}
        />
      )}
    </Form>
  );
}
