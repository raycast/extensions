import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";

import { makeClient } from "../anydo/auth";
import { applyDefaultTime, formatDueUi } from "../anydo/dates";
import { reminderOptions, toLocalIso } from "../anydo/format";
import { t } from "../anydo/i18n";
import { describeParse, parseTaskText } from "../anydo/parse";
import { defaultListName, reminderOffsetMinutes } from "../anydo/prefs";
import {
  composeNote,
  normalizeTags,
  parseNote,
  priorityLabel,
  type Priority,
} from "../anydo/tags";
import type { AnyDoList, RecurrenceType } from "../anydo/types";
import { errorMessage } from "./feedback";

interface FormValues {
  text: string;
  list: string;
  note: string;
  tags: string;
  priority: string;
  reminder: string;
  repeat: string;
}

const TAG_COLORS: Color.ColorLike[] = [
  Color.Purple,
  Color.Blue,
  Color.Green,
  Color.Orange,
  Color.Magenta,
];

const REPEAT_TYPES: Record<string, RecurrenceType> = {
  day: "TASK_REPEAT_DAY",
  week: "TASK_REPEAT_WEEK",
  month: "TASK_REPEAT_MONTH",
  year: "TASK_REPEAT_YEAR",
};

/** The structured add form, reachable from the main page. */
export function QuickAddForm({
  lists,
  knownTags = [],
  initialText = "",
  onCreated,
}: {
  lists: AnyDoList[];
  knownTags?: string[];
  initialText?: string;
  onCreated: () => void;
}) {
  const { pop } = useNavigation();
  const initial = useMemo(() => parseNote(initialText), [initialText]);
  const [text, setText] = useState(initial.text);
  const [tags, setTags] = useState(
    initial.tags.map((tag) => `#${tag}`).join(" "),
  );
  const [pickedTags, setPickedTags] = useState<string[]>(initial.tags);
  const [priority, setPriority] = useState(String(initial.priority));
  const [hasDue, setHasDue] = useState(false);
  const [due, setDue] = useState<Date | null>(null);
  const [reminder, setReminder] = useState("none");
  const [repeat, setRepeat] = useState("none");

  const parsed = useMemo(
    () => (text.trim() ? parseTaskText(text) : null),
    [text],
  );
  /** When the text has no clock, the "defaultTime" preference decides. */
  const parsedDue = parsed?.date
    ? parsed.hasTime
      ? parsed.date
      : applyDefaultTime(parsed.date)
    : null;
  const dueValue = hasDue ? (due ?? parsedDue) : parsedDue;
  const reminderChoices = reminderOptions(dueValue).filter(
    (option) => option.date !== null,
  );

  const preferredList = defaultListName()
    ? (lists.find((list) => list.title.trim() === defaultListName())?.list_id ??
      lists[0]?.list_id ??
      "")
    : (lists[0]?.list_id ?? "");

  async function handleSubmit(values: FormValues) {
    const parsedText = parseTaskText(values.text);
    const title = parsedText.title.trim();
    if (!title) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("متن تسک خالی است", "The task text is empty"),
      });
      return;
    }
    if (!values.list) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("لیستی پیدا نشد", "No list available"),
      });
      return;
    }

    const parsedWhen = parsedText.date
      ? parsedText.hasTime
        ? parsedText.date
        : applyDefaultTime(parsedText.date)
      : null;
    const when = hasDue ? (due ?? parsedWhen) : parsedWhen;
    const note = composeNote(
      values.note,
      [...new Set([...pickedTags, ...normalizeTags(values.tags)])],
      Number(values.priority) as Priority,
    );
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t("در حال ساخت تسک…", "Creating the task…"),
    });

    try {
      const client = makeClient();
      const task = await client.createTask({
        listId: values.list,
        title,
        note: note.length > 0 ? note : null,
        datetime: when ? toLocalIso(when) : null,
      });

      const preferredOffset = reminderOffsetMinutes();
      if (values.reminder && values.reminder !== "none") {
        const chosen = reminderOptions(when).find(
          (option) => option.title === values.reminder,
        );
        if (chosen?.date)
          await client.setReminder(task, toLocalIso(chosen.date));
      } else if (when && preferredOffset !== null) {
        await client.setReminder(
          task,
          toLocalIso(new Date(when.getTime() - preferredOffset * 60_000)),
        );
      }

      if (values.repeat && values.repeat !== "none") {
        await client.setRecurringReminder(
          task,
          toLocalIso(when ?? new Date()),
          REPEAT_TYPES[values.repeat],
        );
      }

      toast.style = Toast.Style.Success;
      toast.title = t("تسک ساخته شد", "Task created");
      toast.message = when ? `${title} · ${formatDueUi(when, true)}` : title;
      onCreated();
      await pop();
    } catch (caught) {
      toast.style = Toast.Style.Failure;
      toast.title = t("ساخت تسک ناموفق بود", "Could not create the task");
      toast.message = errorMessage(caught);
    }
  }

  return (
    <Form
      navigationTitle={t("ساخت تسک", "Add task")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("ساخت تسک", "Add task")}
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action
            title={t("بازگشت", "Back")}
            icon={Icon.ArrowLeft}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title={t("متن تسک", "Task text")}
        placeholder={t(
          "طراحی سایت رامتین ترابر در تاریخ 1405/08/15 در ساعت 19:00",
          "Design site 1405/08/15 19:00",
        )}
        value={text}
        onChange={setText}
        autoFocus
      />
      <Form.Description
        title={t("تفسیر زنده", "Live interpretation")}
        text={
          !text.trim()
            ? t(
                "متنت را بنویس؛ تاریخ و ساعت خودکار تشخیص داده می‌شود.",
                "Type freely — dates and times are detected.",
              )
            : parsed && parsed.date
              ? `«${parsed.title}» · ${describeParse(parsed)}`
              : `«${parsed?.title ?? text}» · ${t("تاریخی پیدا نشد", "no date found")}`
        }
      />
      {knownTags.length > 0 ? (
        <Form.TagPicker
          id="pickedTags"
          title={t("برچسب‌های موجود", "Existing tags")}
          value={pickedTags}
          onChange={setPickedTags}
        >
          {knownTags.map((tag, index) => (
            <Form.TagPicker.Item
              key={tag}
              value={tag}
              title={tag}
              icon={{
                source: Icon.Tag,
                tintColor: TAG_COLORS[index % TAG_COLORS.length],
              }}
            />
          ))}
        </Form.TagPicker>
      ) : null}
      <Form.TextField
        id="tags"
        title={t("برچسب تازه (اختیاری)", "New tags (optional)")}
        value={tags}
        onChange={setTags}
        placeholder={t("مثلاً: منزل کار", "e.g. home work")}
      />
      <Form.Dropdown
        id="priority"
        title={t("اولویت", "Priority")}
        value={priority}
        onChange={setPriority}
      >
        {([0, 1, 2, 3] as Priority[]).map((entry) => (
          <Form.Dropdown.Item
            key={entry}
            value={String(entry)}
            title={priorityLabel(entry)}
            icon={
              entry === 3
                ? Icon.ExclamationMark
                : entry === 0
                  ? Icon.Minus
                  : Icon.ArrowUp
            }
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="list"
        title={t("لیست", "List")}
        defaultValue={preferredList}
      >
        {lists.map((list) => (
          <Form.Dropdown.Item
            key={list.list_id}
            value={list.list_id}
            title={list.title}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="hasDue"
        label={t(
          "سررسید/ساعت را خودم تعیین می‌کنم",
          "Set the due date/time manually",
        )}
        value={hasDue}
        onChange={(next) => {
          setHasDue(next);
          setReminder("none");
        }}
      />
      {hasDue ? (
        <Form.DatePicker
          id="due"
          title={t("سررسید", "Due")}
          type={Form.DatePicker.Type.DateTime}
          value={due}
          onChange={setDue}
        />
      ) : null}
      <Form.Dropdown
        id="reminder"
        title={t("یادآور", "Reminder")}
        value={reminder}
        onChange={setReminder}
      >
        <Form.Dropdown.Item
          value="none"
          title={t("بدون یادآور", "No reminder")}
          icon={Icon.Minus}
        />
        {reminderChoices.map((option) => (
          <Form.Dropdown.Item
            key={option.title}
            value={option.title}
            title={option.title}
            icon={Icon.Bell}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="repeat"
        title={t("تکرار", "Repeat")}
        value={repeat}
        onChange={setRepeat}
      >
        <Form.Dropdown.Item
          value="none"
          title={t("بدون تکرار", "No repeat")}
          icon={Icon.Minus}
        />
        <Form.Dropdown.Item
          value="day"
          title={t("هر روز", "Daily")}
          icon={Icon.Repeat}
        />
        <Form.Dropdown.Item
          value="week"
          title={t("هر هفته", "Weekly")}
          icon={Icon.Repeat}
        />
        <Form.Dropdown.Item
          value="month"
          title={t("هر ماه", "Monthly")}
          icon={Icon.Repeat}
        />
        <Form.Dropdown.Item
          value="year"
          title={t("هر سال", "Yearly")}
          icon={Icon.Repeat}
        />
      </Form.Dropdown>
      <Form.TextArea
        id="note"
        title={t("نوت", "Note")}
        placeholder={t("توضیح دلخواه (اختیاری)", "optional")}
      />
    </Form>
  );
}
