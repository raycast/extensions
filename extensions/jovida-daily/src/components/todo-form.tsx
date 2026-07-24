import { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { create, update } from "../lib/jovida";
import {
  toLocalDate,
  toLocalISO,
  isAllDay,
  parseLocalWhen,
  allDayReminderAnchor,
} from "../lib/format";
import { canUseAI, parseTodoWithAI } from "../lib/ai-parse";
import { withSignIn } from "../lib/auth";
import { Priority, Todo } from "../lib/types";

interface FormValues {
  title: string;
  when: Date | null;
  allDay: boolean;
  remind: Date | null;
  phoneCall: boolean;
  priority: string;
  category: string;
  subtasks: string;
  description: string;
}

export function TodoForm(props: { todo?: Todo; onSaved?: () => void }) {
  const { todo, onSaved } = props;
  const isEdit = Boolean(todo);
  const { pop } = useNavigation();
  const aiAvailable = canUseAI();
  const [brainDump, setBrainDump] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  // First existing reminder (the form edits one; extras are preserved if untouched).
  const initialRemind = todo?.remind_at?.[0]
    ? new Date(todo.remind_at[0])
    : null;
  const initialPhoneCall = Boolean(
    todo?.reminder_channels?.includes("TODO_REMINDER_CHANNEL_VOICE_CALL"),
  );

  const { handleSubmit, itemProps, setValue, values } = useForm<FormValues>({
    async onSubmit(values) {
      if (values.remind && !values.when) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Pick a date first",
          message: "A reminder needs the todo to have a date/time.",
        });
        return;
      }
      if (values.phoneCall && !values.remind) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Pick a reminder time first",
          message: "Phone call reminders need a reminder time.",
        });
        return;
      }
      const remindAnchor =
        values.when && values.allDay
          ? allDayReminderAnchor(values.when)
          : values.when;
      if (
        values.remind &&
        remindAnchor &&
        values.remind.getTime() > remindAnchor.getTime()
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Reminder is after the due time",
          message: values.allDay
            ? "Set the reminder before the end of that day."
            : "Set the reminder at or before the todo's time.",
        });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: isEdit ? "Saving…" : "Creating…",
      });
      try {
        const when = values.when
          ? values.allDay
            ? toLocalDate(values.when)
            : toLocalISO(values.when)
          : undefined;
        const subtasks = values.subtasks
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);

        // Only touch reminders when the field actually changed, so an unrelated
        // edit doesn't collapse a todo's multiple reminders down to one.
        const remindChanged =
          (values.remind ? values.remind.getTime() : null) !==
          (initialRemind ? initialRemind.getTime() : null);
        const reminders = values.remind
          ? [toLocalISO(values.remind)]
          : undefined;

        if (isEdit && todo) {
          await withSignIn(() =>
            update(todo.entry_id, {
              title: values.title,
              priority: values.priority as Priority,
              // Emptying a field on edit must clear it, not be ignored.
              category: values.category || undefined,
              clearCategory: !values.category,
              description: values.description || undefined,
              clearDesc: !values.description,
              when,
              clearWhen: !values.when,
              subtasks: subtasks.length ? subtasks : undefined,
              clearSubtasks: subtasks.length === 0,
              ...(remindChanged
                ? values.remind
                  ? { reminders, phoneReminder: values.phoneCall }
                  : { clearRemind: true }
                : { phoneReminder: values.phoneCall }),
            }),
          );
        } else {
          await withSignIn(() =>
            create({
              title: values.title,
              priority: values.priority as Priority,
              category: values.category || undefined,
              description: values.description || undefined,
              when,
              subtasks: subtasks.length ? subtasks : undefined,
              reminders,
              phoneReminder: values.phoneCall,
            }),
          );
        }
        toast.style = Toast.Style.Success;
        toast.title = isEdit ? "Saved" : "Created";
        onSaved?.();
        pop();
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = isEdit ? "Failed to save" : "Failed to create";
        toast.message = e instanceof Error ? e.message : String(e);
      }
    },
    initialValues: {
      title: todo?.title ?? "",
      when: parseLocalWhen(todo?.when),
      allDay: todo ? isAllDay(todo.when) : true,
      remind: initialRemind,
      phoneCall: initialPhoneCall,
      priority: todo?.priority ?? "none",
      category: todo?.category ?? "",
      subtasks: (todo?.subtasks ?? []).map((s) => s.title).join("\n"),
      description: todo?.description ?? "",
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  async function fillWithAI() {
    if (!brainDump.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to parse",
        message: "Type a note in the AI field first.",
      });
      return;
    }
    setAiBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Parsing with AI…",
    });
    try {
      const p = await parseTodoWithAI(brainDump);
      if (p.title) setValue("title", p.title);
      setValue("when", parseLocalWhen(p.when ?? undefined));
      setValue("allDay", p.allDay);
      setValue("remind", p.reminders[0] ? new Date(p.reminders[0]) : null);
      setValue("phoneCall", p.phoneReminder);
      setValue("priority", p.priority);
      setValue("category", p.category ?? "");
      setValue("subtasks", p.subtasks.join("\n"));
      setValue("description", p.description ?? "");
      toast.style = Toast.Style.Success;
      toast.title = "Filled from AI";
      toast.message = "Review the fields, then create.";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "AI parsing failed";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setAiBusy(false);
    }
  }

  // "Fill Fields with AI" is ALWAYS on ⌘⇧↵ so it can be re-run any number of
  // times (edit the note, run again). ⌘↵ (the first action) is the smart
  // primary: AI parse while the form is still empty, submit once there's a title.
  const aiIsPrimary = aiAvailable && !isEdit && !values.title?.trim();
  const submitAction = (
    <Action.SubmitForm
      title={isEdit ? "Save Todo" : "Create Todo"}
      icon={Icon.Check}
      onSubmit={handleSubmit}
      shortcut={
        aiIsPrimary ? { modifiers: ["cmd", "opt"], key: "return" } : undefined
      }
    />
  );
  const aiAction = aiAvailable && !isEdit && (
    <Action
      title="Fill Fields with AI"
      icon={Icon.Stars}
      onAction={fillWithAI}
      shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
    />
  );

  return (
    <Form
      isLoading={aiBusy}
      navigationTitle={isEdit ? "Edit Todo" : "Add Todo"}
      actions={
        <ActionPanel>
          {aiIsPrimary ? (
            <>
              {aiAction}
              {submitAction}
            </>
          ) : (
            <>
              {submitAction}
              {aiAction}
            </>
          )}
        </ActionPanel>
      }
    >
      {!isEdit && aiAvailable && (
        <>
          <Form.TextArea
            id="brainDump"
            title="Describe (AI)"
            placeholder="e.g. Submit the quarterly report by next Friday 6pm — gather metrics, write summary, get sign-off"
            info="Write naturally, press ⌘↵ to fill the fields. ⌘⇧↵ re-runs anytime."
            value={brainDump}
            onChange={setBrainDump}
          />
          <Form.Separator />
        </>
      )}
      <Form.TextField
        title="Title"
        placeholder="What needs to happen?"
        {...itemProps.title}
      />
      <Form.DatePicker title="When" {...itemProps.when} />
      <Form.Checkbox
        label="All day (no specific time)"
        info="On = the todo belongs to that day. Off = a precise deadline at the chosen time."
        {...itemProps.allDay}
      />
      <Form.DatePicker
        title="Remind me at"
        type={Form.DatePicker.Type.DateTime}
        info="Optional alarm. Must be at or before the todo's time. Editing replaces existing reminders."
        {...itemProps.remind}
      />
      <Form.Checkbox
        label="Phone call reminder"
        info="Uses Jovida's voice-call reminder channel for the reminder time above."
        {...itemProps.phoneCall}
      />
      <Form.Dropdown title="Priority" {...itemProps.priority}>
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
      </Form.Dropdown>
      <Form.TextField
        title="Category"
        placeholder="e.g. work, personal"
        {...itemProps.category}
      />
      <Form.TextArea
        title="Subtasks"
        placeholder="One per line"
        info="Each line becomes a subtask. Editing replaces the whole list."
        {...itemProps.subtasks}
      />
      <Form.TextArea
        title="Description"
        placeholder="Optional details"
        {...itemProps.description}
      />
    </Form>
  );
}
