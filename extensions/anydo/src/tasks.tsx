import {
  Action,
  ActionPanel,
  Alert,
  Color,
  environment,
  Icon,
  List,
  confirmAlert,
  open,
  showToast,
  Toast,
  updateCommandMetadata,
  Keyboard,
  type LaunchProps,
} from "@raycast/api";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { useEffect, useMemo, useReducer, useState } from "react";

import { showToastNotification } from "./anydo/alarm";
import { makeClient } from "./anydo/auth";
import { applyDefaultTime, formatDueUi, relativeLabel } from "./anydo/dates";
import {
  BUCKET_ORDER,
  dueDate,
  reminderLabel,
  reminderOptions,
  toLocalIso,
  type Bucket,
} from "./anydo/format";
import {
  loadCompleted,
  recordCompleted,
  removeFromHistory,
  type CompletedEntry,
} from "./anydo/history";
import { t } from "./anydo/i18n";
import { aiAvailable, analyzeWithAi } from "./anydo/ai-analyze";
import { heuristicAnalysis, type TaskAnalysis } from "./anydo/analyze";
import { parseTaskText } from "./anydo/parse";
import { buildFontPreviewHtml } from "./anydo/archive";
import { loadReportFont } from "./anydo/font";
import { writeMonthlyArchive } from "./anydo/journal";
import { toPersianDigits } from "./anydo/jalali";
import {
  byDueThenTitle,
  isOverdue,
  listTitleOf,
  taskMatches,
  withinWindow,
} from "./anydo/match";
import {
  getCachedSubtasks,
  loadSubtasks,
  subscribeSubtasks,
  toggleSubtask,
} from "./anydo/subtask-cache";
import { strike } from "./anydo/text";
import {
  countdownEnabled,
  defaultListName,
  defaultView,
  lang,
  laterLabel,
  reminderOffsetMinutes,
  subtasksInPane,
  twoPane,
  type ViewMode,
} from "./anydo/prefs";
import {
  composeNote,
  parseNote,
  priorityLabel,
  type Priority,
} from "./anydo/tags";
import type {
  AnyDoList,
  AnyDoSubtask,
  AnyDoTask,
  RecurrenceType,
} from "./anydo/types";
import { AccountView } from "./components/account";
import { CalendarView } from "./components/calendar";
import { CompletedSection } from "./components/completed";
import { runWithToast } from "./components/feedback";
import { FocusView } from "./components/focus";
import { QuickAddForm } from "./components/quick-add-form";
import { SignInEmptyView } from "./components/sign-in";
import { StatsView } from "./components/stats";
import { AddSubtaskForm, EditTaskForm } from "./components/task-forms";
import { TaskDetail } from "./components/task-detail";
import { TaskDetailPane } from "./components/task-detail-pane";
import { useAsync } from "./components/use-async";
import { WorkspacesView } from "./components/workspaces";

type SortMode = "due" | "priority" | "title" | "list";

const REPEAT_TYPES: Record<string, RecurrenceType> = {
  day: "TASK_REPEAT_DAY",
  week: "TASK_REPEAT_WEEK",
  month: "TASK_REPEAT_MONTH",
  year: "TASK_REPEAT_YEAR",
};

const VIEWS: ViewMode[] = ["open", "today", "week", "nodate", "completed"];

/** Platform-aware shortcut (ctrl on Windows, cmd on macOS) to keep the linter happy. */
function sc(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    Windows: { modifiers: ["ctrl"], key },
    macOS: { modifiers: ["cmd"], key },
  };
}
const PRIORITIES: Priority[] = [3, 2, 1, 0];

interface LoadedTasks {
  lists: AnyDoList[];
  tasks: AnyDoTask[];
  history: CompletedEntry[];
}

function viewLabel(view: ViewMode): string {
  switch (view) {
    case "today":
      return t("امروز و عقب‌افتاده", "Today & overdue");
    case "week":
      return t("این هفته", "This week");
    case "nodate":
      return t("بدون تاریخ", "No date");
    case "completed":
      return t("انجام‌شده‌ها", "Completed");
    default:
      return t("همه‌ی باز", "All open");
  }
}

function bucketLabel(bucket: Bucket): string {
  switch (bucket) {
    case "Overdue":
      return `🔴 ${t("عقب‌افتاده", "Overdue")}`;
    case "Today":
      return `🟠 ${t("امروز", "Today")}`;
    case "Tomorrow":
      return `🟡 ${t("فردا", "Tomorrow")}`;
    case "This Week":
      return `🔵 ${t("این هفته", "This week")}`;
    case "Later":
      return `🟣 ${laterLabel()}`;
    default:
      return `⚪ ${t("بدون تاریخ", "No date")}`;
  }
}

/** `Any.do امروز` opens straight on a view — the same argument still works as a search text. */
function viewFromArgument(text?: string): ViewMode | null {
  const raw = (text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\u200c/g, "");
  if (!raw) return null;
  if (/^(امروز|امروز من|my day|today)$/.test(raw)) return "today";
  if (/^(هفته|این هفته|this week|week)$/.test(raw)) return "week";
  if (/^(بدون تاریخ|no date|nodate)$/.test(raw)) return "nodate";
  if (/^(انجام شده|انجامشده|completed|done)$/.test(raw)) return "completed";
  if (/^(همه|همه باز|all|open)$/.test(raw)) return "open";
  return null;
}

const PINNED_TITLE = () => `📌 ${t("سنجاق‌شده", "Pinned")}`;
const DONE_TODAY_TITLE = () =>
  `✅ ${t("انجام‌شده‌های امروز", "Completed today")}`;

function dueBucket(task: AnyDoTask, now: Date): Bucket {
  const due = dueDate(task);
  if (!due) return "No Date";
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return "This Week";
  return "Later";
}

function priorityTint(priority: Priority): Color | undefined {
  if (priority === 3) return Color.Red;
  if (priority === 2) return Color.Orange;
  if (priority === 1) return Color.Blue;
  return undefined;
}

function nextWeekday(now: Date, weekday: number, hours: number): Date {
  const date = new Date(now);
  const delta = (weekday - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  date.setHours(hours, 0, 0, 0);
  return date;
}

function rescheduleTargets(now: Date): { label: string; date: Date }[] {
  const tonight = new Date(now);
  tonight.setHours(21, 0, 0, 0);
  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(9, 0, 0, 0);
  const tomorrowNight = new Date(tomorrowMorning);
  tomorrowNight.setHours(21, 0, 0, 0);

  return [
    { label: t("امشب ۲۱:۰۰", "Tonight 21:00"), date: tonight },
    { label: t("فردا صبح ۰۹:۰۰", "Tomorrow 09:00"), date: tomorrowMorning },
    { label: t("فردا شب ۲۱:۰۰", "Tomorrow 21:00"), date: tomorrowNight },
    {
      label: t("آخر هفته (پنجشنبه ۱۰:۰۰)", "Weekend (Thu 10:00)"),
      date: nextWeekday(now, 4, 10),
    },
    {
      label: t("هفته‌ی بعد (شنبه ۰۹:۰۰)", "Next week (Sat 09:00)"),
      date: nextWeekday(now, 6, 9),
    },
  ];
}

/**
 * The single page: one dropdown for views / lists / tags / priority, search, quick add from free
 * text (with #tags and !! markers), a two-pane detail, sorting and one-key shortcuts.
 */
export default function TasksCommand(
  props: LaunchProps<{ arguments: { text?: string } }>,
) {
  const argumentView = useMemo(
    () => viewFromArgument(props.arguments?.text),
    [props.arguments?.text],
  );
  const [view, setView] = useState<ViewMode>(argumentView ?? defaultView());
  // subtask counts are cached per task; this keeps every row in sync after a toggle
  useEffect(() => subscribeSubtasks(bumpSubtasks), []);
  const [listFilter, setListFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("due");
  const [showDetail, setShowDetail] = useState(twoPane());
  const [searchText, setSearchText] = useState(
    argumentView ? "" : (props.arguments?.text ?? ""),
  );
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [, bumpSubtasks] = useReducer((value: number) => value + 1, 0);

  const { data, error, isLoading, revalidate } = useAsync<LoadedTasks>(
    async () => {
      const client = makeClient();
      const [lists, tasks, history] = await Promise.all([
        client.getLists(),
        client.getAllTasks(),
        loadCompleted(),
      ]);
      return { lists, tasks, history };
    },
  );

  /** Markers (#tag / !) are pulled out of the typed text before it is parsed as a task. */
  const searchMeta = useMemo(() => parseNote(searchText), [searchText]);
  const lists = data?.lists ?? [];
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const aiOn = aiAvailable();

  /**
   * The preview is instant (deterministic analysis) and is then refined once by Raycast AI. The AI can
   * only fill title / note / tags / priority / list — the date always comes from the tested parser.
   */
  useEffect(() => {
    const text = searchMeta.text.trim();
    if (text.length <= 2) {
      setAnalysis(null);
      return;
    }
    const context = {
      lists: data?.lists ?? [],
      knownTags: [
        ...new Set(
          (data?.tasks ?? []).flatMap((task) => parseNote(task.note).tags),
        ),
      ],
      defaultListName: defaultListName(),
    };
    setAnalysis(heuristicAnalysis(text, { ...context, now: new Date() }));

    let active = true;
    const timer = setTimeout(() => {
      void analyzeWithAi(text, { ...context, now: new Date() }).then(
        (refined) => {
          if (active) setAnalysis(refined);
        },
      );
    }, 700);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchMeta.text, data?.lists, data?.tasks]);

  if (error?.name === "NotSignedInError") {
    return <SignInEmptyView onSignedIn={revalidate} />;
  }

  const now = new Date();
  const openTasks = (data?.tasks ?? []).filter(
    (task) => task.status === "unchecked",
  );
  const allTags = [
    ...new Set(openTasks.flatMap((task) => parseNote(task.note).tags)),
  ].sort();

  /** Subtasks are fetched one task at a time, for whichever row is selected. */
  useEffect(() => {
    const selected = openTasks.find((task) => task.task_id === selectedId);
    if (selected && showDetail && subtasksInPane()) void loadSubtasks(selected);
  }, [selectedId, showDetail, openTasks.length]);

  const filtered = openTasks
    .filter((task) => listFilter === "all" || task.list_id === listFilter)
    .filter((task) => taskMatches(task, searchMeta.text))
    .filter((task) =>
      tagFilter ? parseNote(task.note).tags.includes(tagFilter) : true,
    )
    .filter((task) =>
      priorityFilter !== null
        ? parseNote(task.note).priority === priorityFilter
        : true,
    )
    .filter((task) => {
      if (view === "today")
        return (
          withinWindow(task, "today", now) || withinWindow(task, "overdue", now)
        );
      if (view === "week") return withinWindow(task, "week", now);
      if (view === "nodate") return dueDate(task) === null;
      return true;
    })
    .sort((left, right) => {
      if (sortMode === "priority") {
        const delta =
          parseNote(right.note).priority - parseNote(left.note).priority;
        return delta || byDueThenTitle(left, right);
      }
      if (sortMode === "title") return left.title.localeCompare(right.title);
      if (sortMode === "list") {
        const byList = listTitleOf(lists, left.list_id).localeCompare(
          listTitleOf(lists, right.list_id),
        );
        return byList || byDueThenTitle(left, right);
      }
      return byDueThenTitle(left, right);
    });

  const pinned = filtered.filter((task) => parseNote(task.note).priority === 3);

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const completedToday = [...(data?.history ?? [])]
    .filter((entry) => entry.at >= todayStart)
    .sort((left, right) => right.at - left.at)
    .slice(0, 8);

  const grouped = new Map<Bucket, AnyDoTask[]>();
  for (const task of filtered) {
    if (parseNote(task.note).priority === 3) continue;
    const bucket = dueBucket(task, now);
    grouped.set(bucket, [...(grouped.get(bucket) ?? []), task]);
  }

  const preferredListId = defaultListName()
    ? lists.find((list) => list.title.trim() === defaultListName())?.list_id
    : undefined;
  const quickAddListId =
    listFilter !== "all" ? listFilter : (preferredListId ?? lists[0]?.list_id);
  /** The due date the analysis resolved (the default hour is applied when the text had no clock). */
  const analysisDue = analysis?.date
    ? analysis.hasTime
      ? analysis.date
      : applyDefaultTime(analysis.date)
    : null;

  async function quickAdd(listId?: string) {
    const plan = analysis;
    if (!plan?.title.trim()) return;
    const target = listId ?? plan.listId ?? quickAddListId;
    if (!target) return;
    const ok = await runWithToast(
      t("تسک ساخته شد", "Task created"),
      async () => {
        const client = makeClient();
        const due = plan.date
          ? plan.hasTime
            ? plan.date
            : applyDefaultTime(plan.date)
          : null;
        const note = composeNote(plan.note, plan.tags, plan.priority);
        const task = await client.createTask({
          listId: target,
          title: plan.title,
          note: note.length > 0 ? note : null,
          datetime: due ? toLocalIso(due) : null,
        });
        const offset = reminderOffsetMinutes();
        if (due && offset !== null) {
          await client.setReminder(
            task,
            toLocalIso(new Date(due.getTime() - offset * 60_000)),
          );
        }
      },
      revalidate,
    );
    if (ok) setSearchText("");
  }

  async function undoLastCompletion() {
    const entries = await loadCompleted();
    const last = entries[entries.length - 1];
    if (!last) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("چیزی برای بازگرداندن نیست", "Nothing to undo"),
      });
      return;
    }
    await runWithToast(
      t("آخرین تسک برگشت", "Last task reopened"),
      async () => {
        const client = makeClient();
        const task = await client.getTask(last.id);
        await client.setStatus(task, "unchecked");
        await removeFromHistory(last.id);
      },
      revalidate,
    );
  }

  /** The command subtitle follows the language preference (Raycast only allows this at runtime). */
  useEffect(() => {
    void updateCommandMetadata({
      subtitle:
        lang() === "fa"
          ? "جست‌وجو، ساخت، مدیریت، یادآور و گزارش — همه در یک صفحه"
          : "Search, add, manage, remind and report — all in one page",
    });
  }, []);

  /** Opens a sample report in the browser so the chosen font can be checked instantly. */
  async function previewFont() {
    const font = await loadReportFont();
    const html = buildFontPreviewHtml(font, {
      title: t("طراحی سایت رامتین ترابر", "Ramtin Tarabar website design"),
      lines: [
        t(
          "کارهای امروز ۵ · عقب‌افتاده ۱ · انجام‌شده‌ی امروز ۳",
          "Today 5 · Overdue 1 · Completed today 3",
        ),
        t("۱۲۳۴۵۶۷۸۹۰ — نمونه‌ی اعداد فارسی", "1234567890 — digits"),
        t(
          "قرارداد نهایی با مشتری، بازبینی طراحی سایت",
          "Final contract, design review",
        ),
      ],
    });
    const file = join(environment.supportPath, "anydo-font-preview.html");
    await mkdir(environment.supportPath, { recursive: true });
    await writeFile(file, html, "utf8");
    await open(file);
  }

  /** Writes the MD + HTML monthly archive and opens the styled report. */
  async function writeArchive(monthsAgo: number) {
    const entries = await loadCompleted();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth() - monthsAgo,
      1,
    );
    const result = await writeMonthlyArchive({ entries, lists, monthStart });
    if (!result) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("پوشه‌ی خروجی تنظیم نشده", "No output folder configured"),
        message: t(
          "در تنظیمات، «پوشه‌ی فایل لاگ» را انتخاب کن",
          "Set the log folder in preferences",
        ),
      });
      return;
    }
    await showToast({
      style: Toast.Style.Success,
      title: `${t("آرشیو ساخته شد", "Archive written")}: ${toPersianDigits(result.count)} ${t("کار", "tasks")}`,
      message: result.htmlPath,
      primaryAction: {
        title: t("باز کردن گزارش HTML", "Open the HTML report"),
        onAction: () => open(result.htmlPath),
      },
    });
  }

  async function testAlarm() {
    const shown = await showToastNotification(
      t("⏰ تست آلارم Any.do", "⏰ Any.do alarm test"),
      t(
        "اگر این پیام را می‌بینی، آلارم ویندوزی درست کار می‌کند",
        "If you can see this, the Windows alarm works",
      ),
    );
    await showToast(
      shown
        ? {
            style: Toast.Style.Success,
            title: t("نوتیف تست ارسال شد", "Test notification sent"),
          }
        : {
            style: Toast.Style.Failure,
            title: t("ارسال نوتیف ممکن نشد", "Could not send the notification"),
          },
    );
  }

  const selection =
    listFilter !== "all"
      ? `list:${listFilter}`
      : tagFilter
        ? `tag:${tagFilter}`
        : priorityFilter !== null
          ? `prio:${priorityFilter}`
          : `view:${view}`;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      isShowingDetail={showDetail && view !== "completed"}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={t(
        "جست‌وجو کن… یا بنویس تا تسک بسازی (مثلاً: جلسه فردا ۱۰ #کار !!)",
        "Search… or type to create a task (e.g. meeting tomorrow 10 #work !!)",
      )}
      searchBarAccessory={
        <List.Dropdown
          tooltip={t("نما، لیست، برچسب و اولویت", "View, list, tag & priority")}
          storeValue={false}
          value={selection}
          onChange={(value) => {
            const [kind, rest] = [
              value.slice(0, value.indexOf(":")),
              value.slice(value.indexOf(":") + 1),
            ];
            if (kind === "list") {
              setListFilter(rest);
              if (view === "completed") setView("open");
            } else if (kind === "tag") {
              setTagFilter(rest === "__all__" ? null : rest);
              if (view === "completed") setView("open");
            } else if (kind === "prio") {
              setPriorityFilter(
                rest === "__all__" ? null : (Number(rest) as Priority),
              );
              if (view === "completed") setView("open");
            } else {
              setView(rest as ViewMode);
            }
          }}
        >
          <List.Dropdown.Section title={t("نما", "View")}>
            {VIEWS.map((entry) => (
              <List.Dropdown.Item
                key={entry}
                value={`view:${entry}`}
                title={viewLabel(entry)}
                icon={
                  entry === "completed"
                    ? Icon.CheckCircle
                    : entry === "open"
                      ? Icon.List
                      : Icon.Calendar
                }
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title={t("لیست", "List")}>
            <List.Dropdown.Item
              value="list:all"
              title={t("همه‌ی لیست‌ها", "All lists")}
              icon={Icon.List}
            />
            {lists.map((list) => (
              <List.Dropdown.Item
                key={list.list_id}
                value={`list:${list.list_id}`}
                title={list.title}
              />
            ))}
          </List.Dropdown.Section>
          {allTags.length > 0 ? (
            <List.Dropdown.Section title={t("برچسب", "Tag")}>
              <List.Dropdown.Item
                value="tag:__all__"
                title={t("همه‌ی برچسب‌ها", "All tags")}
                icon={Icon.Tag}
              />
              {allTags.map((tag) => (
                <List.Dropdown.Item
                  key={tag}
                  value={`tag:${tag}`}
                  title={`#${tag}`}
                  icon={Icon.Tag}
                />
              ))}
            </List.Dropdown.Section>
          ) : null}
          <List.Dropdown.Section title={t("اولویت", "Priority")}>
            <List.Dropdown.Item
              value="prio:__all__"
              title={t("همه", "Any")}
              icon={Icon.Minus}
            />
            {PRIORITIES.map((priority) => (
              <List.Dropdown.Item
                key={priority}
                value={`prio:${priority}`}
                title={priorityLabel(priority)}
                icon={priority === 3 ? Icon.ExclamationMark : Icon.ArrowUp}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title={t("ساخت تسک (فرم)", "Add task (form)")}
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={
                <QuickAddForm
                  lists={lists}
                  knownTags={allTags}
                  initialText={searchText}
                  onCreated={revalidate}
                />
              }
            />
            <Action
              title={t(
                "بازگرداندن آخرین تسک انجام‌شده",
                "Undo last completion",
              )}
              icon={Icon.ArrowCounterClockwise}
              onAction={undoLastCompletion}
            />
            <Action
              title={
                showDetail
                  ? t("حالت تک‌ستونه", "Single-pane list")
                  : t("حالت دوستونه", "Two-pane list")
              }
              icon={Icon.AppWindowSidebarRight}
              shortcut={sc("d")}
              onAction={() => setShowDetail((value) => !value)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title={t("نما", "View")}>
            {VIEWS.map((entry, index) => (
              <Action
                key={entry}
                title={viewLabel(entry)}
                icon={
                  view === entry
                    ? Icon.Checkmark
                    : entry === "completed"
                      ? Icon.CheckCircle
                      : Icon.List
                }
                shortcut={sc(String(index + 1) as Keyboard.KeyEquivalent)}
                onAction={() => setView(entry)}
              />
            ))}
            <ActionPanel.Submenu
              title={t("چیدمان", "Sort")}
              icon={Icon.ArrowUp}
            >
              <Action
                title={t("بر اساس سررسید", "By due date")}
                icon={sortMode === "due" ? Icon.Checkmark : Icon.Calendar}
                onAction={() => setSortMode("due")}
              />
              <Action
                title={t("بر اساس اولویت", "By priority")}
                icon={
                  sortMode === "priority"
                    ? Icon.Checkmark
                    : Icon.ExclamationMark
                }
                onAction={() => setSortMode("priority")}
              />
              <Action
                title={t("بر اساس عنوان", "By title")}
                icon={sortMode === "title" ? Icon.Checkmark : Icon.Text}
                onAction={() => setSortMode("title")}
              />
              <Action
                title={t("بر اساس لیست", "By list")}
                icon={sortMode === "list" ? Icon.Checkmark : Icon.Folder}
                onAction={() => setSortMode("list")}
              />
            </ActionPanel.Submenu>
            <ActionPanel.Submenu
              title={t("فیلتر لیست", "Filter by list")}
              icon={Icon.Folder}
            >
              <Action
                title={t("همه‌ی لیست‌ها", "All lists")}
                icon={listFilter === "all" ? Icon.Checkmark : Icon.List}
                onAction={() => setListFilter("all")}
              />
              {lists.map((list) => (
                <Action
                  key={list.list_id}
                  title={list.title}
                  icon={
                    listFilter === list.list_id ? Icon.Checkmark : Icon.Circle
                  }
                  onAction={() => setListFilter(list.list_id)}
                />
              ))}
            </ActionPanel.Submenu>
            {allTags.length > 0 ? (
              <ActionPanel.Submenu
                title={t("فیلتر برچسب", "Filter by tag")}
                icon={Icon.Tag}
              >
                <Action
                  title={t("همه‌ی برچسب‌ها", "All tags")}
                  icon={tagFilter === null ? Icon.Checkmark : Icon.Tag}
                  onAction={() => setTagFilter(null)}
                />
                {allTags.map((tag) => (
                  <Action
                    key={tag}
                    title={`#${tag}`}
                    icon={tagFilter === tag ? Icon.Checkmark : Icon.Tag}
                    onAction={() => setTagFilter(tag)}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section title={t("صفحه‌ها", "Pages")}>
            <Action.Push
              title={t("تقویم و جلسات", "Calendar")}
              icon={Icon.Calendar}
              target={<CalendarView onChanged={revalidate} />}
            />
            <Action.Push
              title={t("آمار و داشبورد", "Stats")}
              icon={Icon.BarChart}
              target={<StatsView onChanged={revalidate} />}
            />
            <Action.Push
              title={t("تیم و بردها", "Teams & boards")}
              icon={Icon.TwoPeople}
              target={<WorkspacesView />}
            />
            <Action.Push
              title={t("حساب Any.do", "Account")}
              icon={Icon.Person}
              target={<AccountView onChanged={revalidate} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <ActionPanel.Submenu
              title={t("آرشیو ماهانه‌ی کارها", "Monthly archive")}
              icon={Icon.BarChart}
            >
              <Action
                title={t("ماه جاری", "This month")}
                onAction={() => writeArchive(0)}
              />
              <Action
                title={t("ماه گذشته", "Last month")}
                onAction={() => writeArchive(-1)}
              />
            </ActionPanel.Submenu>
            <Action
              title={t("پیش‌نمایش فونت گزارش", "Preview the report font")}
              icon={Icon.Text}
              onAction={previewFont}
            />
            <Action
              title={t("تست آلارم ویندوزی", "Test Windows alarm")}
              icon={Icon.Bell}
              onAction={testAlarm}
            />
            <Action
              title={t("تازه‌سازی", "Refresh")}
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={t("تسک‌ها بارگذاری نشد", "Could not load tasks")}
          description={error.message}
        />
      ) : (
        <>
          {view === "completed" ? (
            <CompletedSection lists={lists} onChanged={revalidate} />
          ) : (
            <>
              {analysis?.title.trim() ? (
                <List.Section
                  title={t("ساخت هوشمند از متن", "Smart add from text")}
                  subtitle={
                    analysis.source === "ai"
                      ? t("تحلیل هوش مصنوعی", "analysed by AI")
                      : aiOn
                        ? t("تحلیل سریع…", "instant analysis…")
                        : t("تحلیل سریع", "instant analysis")
                  }
                >
                  <List.Item
                    icon={{
                      source: analysis.source === "ai" ? Icon.Stars : Icon.Plus,
                      tintColor: Color.Orange,
                    }}
                    title={`${t("ساخت", "Create")}: ${analysis.title}`}
                    subtitle={analysis.reason}
                    detail={
                      <List.Item.Detail
                        markdown={[
                          `# ➕ ${analysis.title}`,
                          analysis.reason,
                          analysis.note
                            ? `\`\`\`
${analysis.note}
\`\`\``
                            : "",
                        ]
                          .filter(Boolean)
                          .join("\n\n")}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label
                              title={`📁 ${t("لیست", "List")}`}
                              text={
                                analysis.listTitle ??
                                listTitleOf(lists, quickAddListId ?? "")
                              }
                              icon={Icon.Folder}
                            />
                            <List.Item.Detail.Metadata.Label
                              title={`📅 ${t("سررسید", "Due")}`}
                              text={
                                analysisDue
                                  ? formatDueUi(analysisDue, analysis.hasTime)
                                  : t("بدون تاریخ", "no date")
                              }
                              icon={Icon.Calendar}
                            />
                            <List.Item.Detail.Metadata.Label
                              title={`🚩 ${t("اولویت", "Priority")}`}
                              text={priorityLabel(analysis.priority)}
                            />
                            <List.Item.Detail.Metadata.TagList
                              title={`🏷 ${t("برچسب‌ها", "Tags")}`}
                            >
                              {analysis.tags.length > 0 ? (
                                analysis.tags.map((tag) => (
                                  <List.Item.Detail.Metadata.TagList.Item
                                    key={tag}
                                    text={`#${tag}`}
                                    color={Color.Purple}
                                  />
                                ))
                              ) : (
                                <List.Item.Detail.Metadata.TagList.Item
                                  text={t("بدون برچسب", "no tags")}
                                  color={Color.SecondaryText}
                                />
                              )}
                            </List.Item.Detail.Metadata.TagList>
                            {analysis.items.length > 0 ? (
                              <List.Item.Detail.Metadata.Label
                                title={`🧾 ${t("اقلام", "Items")}`}
                                text={toPersianDigits(analysis.items.length)}
                              />
                            ) : null}
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    accessories={[
                      {
                        tag: {
                          value:
                            analysis.source === "ai"
                              ? `🤖 ${t("هوش مصنوعی", "AI")}`
                              : `⚡ ${t("فوری تحلیل", "instant")}`,
                          color:
                            analysis.source === "ai"
                              ? Color.Purple
                              : Color.SecondaryText,
                        },
                        tooltip:
                          analysis.source === "ai"
                            ? t(
                                "عنوان/نوت/برچسب/اولویت/لیست را هوش مصنوعی رایکست چید",
                                "Title/note/tags/priority/list were arranged by Raycast AI",
                              )
                            : aiOn
                              ? t(
                                  "تحلیل قواعدی؛ نتیجه‌ی هوش مصنوعی به‌زودی جایگزین می‌شود",
                                  "Rule-based for now — the AI result replaces it shortly",
                                )
                              : t(
                                  "هوش مصنوعی رایکست در دسترس نیست؛ تحلیلی انجام شد",
                                  "Raycast AI is not available; analysed by rules",
                                ),
                      },
                      ...analysis.tags.map((tag) => ({
                        tag: { value: `#${tag}`, color: Color.Purple },
                      })),
                      ...(analysis.priority > 0
                        ? [
                            {
                              tag: {
                                value: priorityLabel(analysis.priority),
                                color: priorityTint(analysis.priority),
                              },
                            },
                          ]
                        : []),
                      {
                        tag: {
                          value:
                            analysis.listTitle ??
                            listTitleOf(lists, quickAddListId ?? ""),
                          color: Color.Orange,
                        },
                      },
                      ...(analysisDue
                        ? [
                            {
                              tag: {
                                value: formatDueUi(
                                  analysisDue,
                                  analysis.hasTime,
                                ),
                                color: Color.Green,
                              },
                            },
                          ]
                        : []),
                      ...(analysis.items.length > 0
                        ? [
                            {
                              text: `🧾 ${toPersianDigits(analysis.items.length)}`,
                            },
                          ]
                        : []),
                    ]}
                    actions={
                      <ActionPanel>
                        <Action
                          title={t("ساخت تسک", "Create task")}
                          icon={Icon.Plus}
                          onAction={() => quickAdd()}
                        />
                        <ActionPanel.Submenu
                          title={t(
                            "ساخت در لیست دیگر",
                            "Create in another list",
                          )}
                          icon={Icon.Folder}
                        >
                          {lists.map((list) => (
                            <Action
                              key={list.list_id}
                              title={list.title}
                              onAction={() => quickAdd(list.list_id)}
                            />
                          ))}
                        </ActionPanel.Submenu>
                        <Action.Push
                          title={t(
                            "ساخت با فرم (جزئیات بیشتر)",
                            "Add with form (more options)",
                          )}
                          icon={Icon.Pencil}
                          target={
                            <QuickAddForm
                              lists={lists}
                              knownTags={allTags}
                              initialText={searchText}
                              onCreated={revalidate}
                            />
                          }
                        />
                        <Action
                          title={t(
                            "پاک کردن کادر جست‌وجو",
                            "Clear the search bar",
                          )}
                          icon={Icon.XMarkCircle}
                          onAction={() => setSearchText("")}
                        />
                      </ActionPanel>
                    }
                  />
                </List.Section>
              ) : null}

              {pinned.length > 0 ? (
                <List.Section
                  title={PINNED_TITLE()}
                  subtitle={toPersianDigits(pinned.length)}
                >
                  {pinned.map((task) => (
                    <TaskItem
                      key={task.task_id}
                      task={task}
                      lists={lists}
                      revalidate={revalidate}
                      searchText={searchMeta.text}
                      now={now}
                      subtasks={getCachedSubtasks(task.task_id)}
                    />
                  ))}
                </List.Section>
              ) : null}

              {BUCKET_ORDER.filter((bucket) => grouped.has(bucket)).map(
                (bucket) => {
                  const bucketTasks = grouped.get(bucket) ?? [];
                  return (
                    <List.Section
                      key={bucket}
                      title={bucketLabel(bucket)}
                      subtitle={toPersianDigits(bucketTasks.length)}
                    >
                      {bucketTasks.map((task) => (
                        <TaskItem
                          key={task.task_id}
                          task={task}
                          lists={lists}
                          revalidate={revalidate}
                          searchText={searchMeta.text}
                          now={now}
                          subtasks={getCachedSubtasks(task.task_id)}
                        />
                      ))}
                    </List.Section>
                  );
                },
              )}

              {completedToday.length > 0 ? (
                <List.Section
                  title={DONE_TODAY_TITLE()}
                  subtitle={toPersianDigits(completedToday.length)}
                >
                  {completedToday.map((entry) => (
                    <CompletedRow
                      key={entry.id}
                      entry={entry}
                      lists={lists}
                      onChanged={revalidate}
                    />
                  ))}
                </List.Section>
              ) : null}

              <List.EmptyView
                icon={analysis?.title ? Icon.Plus : Icon.CheckCircle}
                title={
                  analysis?.title
                    ? t("با Enter بساز", "Press Enter to create")
                    : t("همه‌چیز مرتب است", "All clear")
                }
                description={
                  analysis?.title
                    ? `«${analysis.title}» · ${analysis.reason}`
                    : t(
                        "تسکی در این نما نیست. کافی است متن بنویسی تا تسک تازه ساخته شود.",
                        "Nothing in this view — just type to create a task.",
                      )
                }
              />
            </>
          )}
        </>
      )}
    </List>
  );
}

/** A finished task, shown inside the main list with a check, a red tag and a line through it. */
function CompletedRow({
  entry,
  lists,
  onChanged,
}: {
  entry: CompletedEntry;
  lists: AnyDoList[];
  onChanged: () => void;
}) {
  const when = relativeLabel(new Date(entry.at), new Date());

  async function reopen() {
    await runWithToast(
      t("دوباره باز شد", "Reopened"),
      async () => {
        const client = makeClient();
        const task = await client.getTask(entry.id);
        await client.setStatus(task, "unchecked");
        await removeFromHistory(entry.id);
      },
      onChanged,
    );
  }

  return (
    <List.Item
      icon={{ source: Icon.CheckCircle, tintColor: Color.Red }}
      title={{ value: strike(entry.title), tooltip: entry.title }}
      accessories={[
        { tag: { value: t("به اتمام رسیده", "Completed"), color: Color.Red } },
        {
          tag: {
            value: listTitleOf(lists, entry.listId ?? ""),
            color: Color.Blue,
          },
          tooltip: t("لیست", "List"),
        },
        { text: when },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={t("برگرداندن به حالت باز", "Mark as not completed")}
            icon={Icon.ArrowCounterClockwise}
            onAction={reopen}
          />
          <Action.CopyToClipboard
            title={t("کپی عنوان", "Copy title")}
            content={entry.title}
          />
        </ActionPanel>
      }
    />
  );
}

function TaskItem({
  task,
  lists,
  revalidate,
  searchText,
  now,
  subtasks,
}: {
  task: AnyDoTask;
  lists: AnyDoList[];
  revalidate: () => void;
  searchText: string;
  now: Date;
  subtasks: AnyDoSubtask[];
}) {
  const due = dueDate(task);
  const overdue = isOverdue(task, now);
  const dueNow = Boolean(due && due.getTime() <= now.getTime());
  const listTitle = listTitleOf(lists, task.list_id);
  const meta = parseNote(task.note);
  const parsed = useMemo(
    () => (searchText.trim().length > 2 ? parseTaskText(searchText) : null),
    [searchText],
  );
  const showCountdown = countdownEnabled();
  const targets = rescheduleTargets(now);

  async function complete() {
    await runWithToast(
      t("انجام شد", "Completed"),
      async () => {
        await makeClient().setStatus(task, "checked");
        await recordCompleted(task, listTitle);
      },
      revalidate,
    );
  }

  async function remindIn(minutes: number) {
    const when = new Date(Date.now() + minutes * 60_000);
    await runWithToast(
      `${t("یادآور", "Reminder")}: ${toPersianDigits(minutes)} ${t("دقیقه دیگر", "min")}`,
      () => makeClient().setReminder(task, toLocalIso(when)),
      revalidate,
    );
  }

  async function setPriority(priority: Priority) {
    await runWithToast(
      `${t("اولویت", "Priority")}: ${priorityLabel(priority)}`,
      () =>
        makeClient().editTask(task, {
          note: composeNote(meta.text, meta.tags, priority),
        }),
      revalidate,
    );
  }

  async function remove() {
    const confirmed = await confirmAlert({
      title: t("این تسک حذف شود؟", "Delete this task?"),
      message: t(
        `«${task.title}» به‌عنوان انجام‌شده علامت می‌خورد (API رسمی Any.do حذف فیزیکی ندارد) و از نمای «انجام‌شده‌ها» قابل برگرداندن است.`,
        `“${task.title}” will be marked as done (Any.do's API has no hard delete) and can be reopened from the Completed view.`,
      ),
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: {
        title: t("حذف", "Delete"),
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await runWithToast(
      t("از لیست برداشته شد", "Removed from the list"),
      async () => {
        await makeClient().setStatus(task, "checked");
        await recordCompleted(task, listTitle);
      },
      revalidate,
    );
  }

  async function setReminder(date: Date, repeat?: string) {
    const client = makeClient();
    if (repeat) {
      await runWithToast(
        `${t("یادآور تکراری", "Repeating reminder")}: ${reminderLabel(date)}`,
        () =>
          client.setRecurringReminder(
            task,
            toLocalIso(date),
            REPEAT_TYPES[repeat],
          ),
        revalidate,
      );
      return;
    }
    await runWithToast(
      `${t("یادآور", "Reminder")}: ${reminderLabel(date)}`,
      () => client.setReminder(task, toLocalIso(date)),
      revalidate,
    );
  }

  async function applyParsedDate(date: Date) {
    await runWithToast(
      `${t("زمان تسک", "Task time")}: ${formatDueUi(date, true)}`,
      () => makeClient().setReminder(task, toLocalIso(date)),
      revalidate,
    );
  }

  const doneSubtasks = subtasks.filter((item) => item.status === "checked");

  return (
    <List.Item
      id={task.task_id}
      icon={
        meta.priority === 3
          ? { source: Icon.ExclamationMark, tintColor: Color.Red }
          : dueNow
            ? { source: Icon.ExclamationMark, tintColor: Color.Red }
            : overdue
              ? { source: Icon.Clock, tintColor: Color.Orange }
              : { source: Icon.Circle, tintColor: Color.Green }
      }
      title={{
        value: task.title,
        tooltip:
          meta.text.length > 0 ? `${task.title}\n\n${meta.text}` : task.title,
      }}
      keywords={[listTitle, ...meta.tags]}
      detail={<TaskDetailPane task={task} lists={lists} />}
      accessories={[
        ...(meta.priority > 0
          ? [
              {
                tag: {
                  value: priorityLabel(meta.priority),
                  color: priorityTint(meta.priority),
                },
              },
            ]
          : []),
        ...meta.tags.map((tag) => ({
          tag: { value: `#${tag}`, color: Color.Purple },
        })),
        {
          tag: { value: listTitle, color: Color.Blue },
          tooltip: t("لیست", "List"),
        },
        due
          ? {
              tag: {
                value: formatDueUi(due, Boolean(task.datetime)),
                color: dueNow ? Color.Red : Color.SecondaryText,
              },
            }
          : { text: t("بدون تاریخ", "no date") },
        ...(due && showCountdown ? [{ text: relativeLabel(due, now) }] : []),
        ...(subtasks.length > 0
          ? [
              {
                text: `☑ ${toPersianDigits(doneSubtasks.length)}/${toPersianDigits(subtasks.length)}`,
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          {subtasks.length > 0 ? (
            <ActionPanel.Section
              title={`${t("زیرتسک‌ها", "Subtasks")} — ${doneSubtasks.length}/${subtasks.length}`}
            >
              {subtasks.map((item) => (
                <Action
                  key={item.subtask_id}
                  title={
                    item.status === "checked"
                      ? `⬜ ${t("برداشتن تیک", "Uncheck")}: ${item.title}`
                      : `✅ ${t("تیک زدن", "Check")}: ${item.title}`
                  }
                  icon={
                    item.status === "checked" ? Icon.Circle : Icon.CheckCircle
                  }
                  onAction={() =>
                    runWithToast(
                      t("زیرتسک به‌روز شد", "Subtask updated"),
                      () =>
                        toggleSubtask(task, item, item.status !== "checked"),
                      revalidate,
                    )
                  }
                />
              ))}
              <Action.Push
                title={t("افزودن زیرتسک", "Add subtask")}
                icon={Icon.PlusCircle}
                target={<AddSubtaskForm task={task} onSaved={revalidate} />}
              />
            </ActionPanel.Section>
          ) : null}

          <ActionPanel.Section>
            <Action
              title={t("انجام شد", "Mark as done")}
              icon={Icon.CheckCircle}
              onAction={complete}
            />
            <Action
              title={t("یادآور ۵ دقیقه دیگر", "Remind me in 5 minutes")}
              icon={Icon.Bell}
              shortcut={sc("m")}
              onAction={() => remindIn(5)}
            />
            <Action.Push
              title={t("جزئیات تسک", "Task details")}
              icon={Icon.Eye}
              target={
                <TaskDetail task={task} lists={lists} onChanged={revalidate} />
              }
            />
            <Action.Push
              title={t("شروع تمرکز (پومودورو)", "Start focus (pomodoro)")}
              icon={Icon.Clock}
              target={<FocusView task={task} onDone={revalidate} />}
            />
            <Action.Push
              title={t("ویرایش", "Edit")}
              icon={Icon.Pencil}
              target={
                <EditTaskForm task={task} lists={lists} onSaved={revalidate} />
              }
            />
            <Action.Push
              title={t("افزودن سابتسک", "Add subtask")}
              icon={Icon.PlusCircle}
              target={<AddSubtaskForm task={task} onSaved={revalidate} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <ActionPanel.Submenu
              title={t("اولویت", "Priority")}
              icon={Icon.ExclamationMark}
            >
              {PRIORITIES.map((priority) => (
                <Action
                  key={priority}
                  title={priorityLabel(priority)}
                  icon={
                    meta.priority === priority ? Icon.Checkmark : Icon.ArrowUp
                  }
                  onAction={() => setPriority(priority)}
                />
              ))}
            </ActionPanel.Submenu>

            <ActionPanel.Submenu
              title={t("یادآور کوتاه", "Quick reminder")}
              icon={Icon.Bell}
            >
              <Action
                title={t("۵ دقیقه دیگر", "In 5 minutes")}
                onAction={() => remindIn(5)}
              />
              <Action
                title={t("۱۰ دقیقه دیگر", "In 10 minutes")}
                onAction={() => remindIn(10)}
              />
              <Action
                title={t("۳۰ دقیقه دیگر", "In 30 minutes")}
                onAction={() => remindIn(30)}
              />
              <Action
                title={t("۲ ساعت دیگر", "In 2 hours")}
                onAction={() => remindIn(120)}
              />
            </ActionPanel.Submenu>

            <ActionPanel.Submenu
              title={t("جابه‌جایی سریع", "Quick reschedule")}
              icon={Icon.Forward}
            >
              {targets.map((target) => (
                <Action
                  key={target.label}
                  title={target.label}
                  onAction={() => setReminder(target.date)}
                />
              ))}
            </ActionPanel.Submenu>

            {parsed?.date ? (
              <Action
                title={`${t("زمان از متن", "Time from text")}: ${formatDueUi(parsed.date, parsed.hasTime)}`}
                icon={Icon.Clock}
                onAction={() =>
                  applyParsedDate(
                    parsed.hasTime
                      ? parsed.date!
                      : applyDefaultTime(parsed.date!),
                  )
                }
              />
            ) : null}

            <ActionPanel.Submenu
              title={t("یادآور", "Reminder")}
              icon={Icon.Bell}
            >
              {reminderOptions(due)
                .filter((option) => option.date !== null)
                .map((option) => (
                  <Action
                    key={option.title}
                    title={option.title}
                    onAction={() => setReminder(option.date as Date)}
                  />
                ))}
            </ActionPanel.Submenu>

            <ActionPanel.Submenu
              title={t("یادآور تکراری", "Repeating reminder")}
              icon={Icon.Repeat}
            >
              <Action
                title={t("هر روز – فردا ۰۹:۰۰", "Daily – tomorrow 09:00")}
                onAction={() => setReminder(targets[1].date, "day")}
              />
              <Action
                title={t("هر هفته", "Weekly")}
                onAction={() => setReminder(targets[1].date, "week")}
              />
              <Action
                title={t("هر ماه", "Monthly")}
                onAction={() => setReminder(targets[1].date, "month")}
              />
              <Action
                title={t("هر سال", "Yearly")}
                onAction={() => setReminder(targets[1].date, "year")}
              />
            </ActionPanel.Submenu>

            <ActionPanel.Submenu
              title={t("جابه‌جایی به لیست", "Move to list")}
              icon={Icon.Folder}
            >
              {lists
                .filter((list) => list.list_id !== task.list_id)
                .map((list) => (
                  <Action
                    key={list.list_id}
                    title={list.title}
                    onAction={() =>
                      runWithToast(
                        `${t("به", "Moved to")} «${list.title}»`,
                        () => makeClient().moveToList(task, list.list_id),
                        revalidate,
                      )
                    }
                  />
                ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title={t("باز کردن Any.do", "Open Any.do")}
              icon={Icon.Globe}
              onAction={() => open("https://app.any.do/")}
            />
            <Action.CopyToClipboard
              title={t("کپی عنوان", "Copy title")}
              content={task.title}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title={t("حذف (انجام‌شده)", "Delete (marks as done)")}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
