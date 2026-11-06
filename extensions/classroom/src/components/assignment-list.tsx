import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
} from "@raycast/api";
import { useState } from "react";
import {
  Assignment,
  classroomLink,
  CourseworkFailure,
  dueDate,
  Status,
  submissionStatus,
} from "../lib/api";

type Group =
  "overdue" | "today" | "tomorrow" | "week" | "later" | "none" | "done";

const GROUPS: { id: Group; title: string }[] = [
  { id: "overdue", title: "Overdue" },
  { id: "today", title: "Due Today" },
  { id: "tomorrow", title: "Due Tomorrow" },
  { id: "week", title: "Due This Week" },
  { id: "later", title: "Later" },
  { id: "none", title: "No Due Date" },
  { id: "done", title: "Turned In" },
];

const STATUS: Record<
  Status,
  { label: string; color: Color; icon: Image.ImageLike } | undefined
> = {
  done: {
    label: "Turned in",
    color: Color.Green,
    icon: { source: Icon.CheckCircle, tintColor: Color.Green },
  },
  graded: {
    label: "Graded",
    color: Color.Blue,
    icon: { source: Icon.CheckCircle, tintColor: Color.Blue },
  },
  late: {
    label: "Done late",
    color: Color.Yellow,
    icon: { source: Icon.CheckCircle, tintColor: Color.Yellow },
  },
  missing: {
    label: "Missing",
    color: Color.Red,
    icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
  },
  todo: {
    label: "Assigned",
    color: Color.SecondaryText,
    icon: { source: Icon.Circle, tintColor: Color.SecondaryText },
  },
  unknown: undefined,
};

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function groupOf(item: Assignment, status: Status, now: Date): Group {
  if (status === "done" || status === "graded" || status === "late")
    return "done";
  const due = dueDate(item);
  if (!due) return "none";
  const day = 86_400_000;
  const today = startOfDay(now);
  const dueDay = startOfDay(due);
  if (due.getTime() < now.getTime()) return "overdue";
  if (dueDay === today) return "today";
  if (dueDay === today + day) return "tomorrow";
  if (dueDay < today + 7 * day) return "week";
  return "later";
}

function relative(due: Date, now: Date): string {
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);
  const time = due.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Tomorrow ${time}`;
  if (days === -1) return `Yesterday ${time}`;
  if (days > 1 && days < 7)
    return due.toLocaleDateString(undefined, { weekday: "short" }) + ` ${time}`;
  return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AssignmentList({
  items,
  failures = [],
  isLoading,
  refresh,
  errorView,
  title,
}: {
  items: Assignment[];
  failures?: CourseworkFailure[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  errorView?: React.ReactNode;
  title?: string;
}) {
  const [filter, setFilter] = useState("active");
  const now = new Date();
  const hasStatus = items.some((item) => item.submission?.kind === "mine");

  const enriched = items
    .map((item) => {
      const status = submissionStatus(item, now.getTime());
      return { item, status, group: groupOf(item, status, now) };
    })
    .filter(({ group, status }) => {
      switch (filter) {
        case "active":
          return group !== "done";
        case "missing":
          return status === "missing" || (!hasStatus && group === "overdue");
        case "done":
          return group === "done";
        default:
          return true;
      }
    })
    .sort(
      (a, b) =>
        (dueDate(a.item)?.getTime() ?? Infinity) -
          (dueDate(b.item)?.getTime() ?? Infinity) ||
        a.item.title.localeCompare(b.item.title),
    );

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={refresh}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );

  function row({ item, status }: (typeof enriched)[number]) {
    const due = dueDate(item);
    const url = classroomLink(item.alternateLink);
    const mine = item.submission?.kind === "mine" ? item.submission : undefined;
    const cls = item.submission?.kind === "class" ? item.submission : undefined;
    const badge = STATUS[status];
    const accessories: List.Item.Accessory[] = [];
    if (badge && status !== "todo")
      accessories.push({ tag: { value: badge.label, color: badge.color } });
    if (cls) {
      accessories.push({
        tag: {
          value: `${cls.turnedIn + cls.returned}/${cls.total} in`,
          color: Color.Blue,
        },
        tooltip: `${cls.turnedIn} turned in, ${cls.returned} returned, ${cls.late} late`,
      });
    }
    accessories.push({
      text: due
        ? {
            value: relative(due, now),
            color: status === "missing" ? Color.Red : undefined,
          }
        : "No due date",
      tooltip: due?.toLocaleString(),
    });
    const grade =
      mine?.grade !== undefined
        ? `${mine.grade}${item.maxPoints ? ` / ${item.maxPoints}` : ""}`
        : undefined;

    return (
      <List.Item
        key={`${item.courseId}-${item.id}`}
        title={item.title}
        subtitle={item.courseName}
        keywords={[item.courseName, item.workType ?? "", badge?.label ?? ""]}
        icon={badge?.icon ?? Icon.Document}
        accessories={accessories}
        detail={
          <List.Item.Detail
            markdown={`## ${item.title}\n\n${item.description || "_No description provided._"}`}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Course"
                  text={item.courseName}
                />
                <List.Item.Detail.Metadata.Label
                  title="Type"
                  text={(item.workType ?? "Coursework")
                    .replaceAll("_", " ")
                    .toLowerCase()}
                />
                <List.Item.Detail.Metadata.Label
                  title="Due"
                  text={due?.toLocaleString() ?? "No due date"}
                />
                {item.maxPoints ? (
                  <List.Item.Detail.Metadata.Label
                    title="Points"
                    text={String(item.maxPoints)}
                  />
                ) : null}
                {badge ? (
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={badge.label}
                      color={badge.color}
                    />
                  </List.Item.Detail.Metadata.TagList>
                ) : null}
                {grade ? (
                  <List.Item.Detail.Metadata.Label title="Grade" text={grade} />
                ) : null}
                {cls ? (
                  <>
                    <List.Item.Detail.Metadata.Label
                      title="Turned In"
                      text={`${cls.turnedIn} of ${cls.total}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Returned"
                      text={String(cls.returned)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Late"
                      text={String(cls.late)}
                    />
                  </>
                ) : null}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            {mine?.link || url ? (
              <Action.OpenInBrowser
                title={
                  mine?.link
                    ? "Open My Work in Classroom"
                    : "Open Coursework in Classroom"
                }
                url={(mine?.link ?? url) as string}
              />
            ) : null}
            {mine?.link && url ? (
              <Action.OpenInBrowser title="Open Assignment Page" url={url} />
            ) : null}
            {url ? (
              <Action.CopyToClipboard
                title="Copy Coursework Link"
                content={url}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Assignment Title"
              content={item.title}
            />
            {refreshAction}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      navigationTitle={title ?? "Coursework"}
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search assignments or courses…"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={filter} onChange={setFilter}>
          <List.Dropdown.Item value="active" title="To Do" icon={Icon.Circle} />
          <List.Dropdown.Item
            value="missing"
            title={hasStatus ? "Missing" : "Overdue"}
            icon={Icon.ExclamationMark}
          />
          <List.Dropdown.Item
            value="done"
            title="Turned In"
            icon={Icon.CheckCircle}
          />
          <List.Dropdown.Item value="all" title="Everything" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      {errorView ?? (
        <List.EmptyView
          icon={filter === "active" ? Icon.Stars : Icon.Document}
          title={filter === "active" ? "All caught up" : "No Coursework"}
          description={
            filter === "active"
              ? "Nothing to do right now. Switch the filter to see turned-in work."
              : "Nothing matches this filter."
          }
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      )}
      {failures.length > 0 && (
        <List.Section title="Some Courses Could Not Be Loaded">
          {failures.map((failure) => (
            <List.Item
              key={failure.courseId}
              title={failure.course}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
              detail={<List.Item.Detail markdown={failure.message} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Retry Loading Courses"
                    icon={Icon.ArrowClockwise}
                    onAction={refresh}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {GROUPS.map(({ id, title: groupTitle }) => {
        const rows = enriched.filter((entry) => entry.group === id);
        if (!rows.length) return null;
        return (
          <List.Section
            key={id}
            title={id === "overdue" && hasStatus ? "Missing" : groupTitle}
            subtitle={String(rows.length)}
          >
            {rows.map(row)}
          </List.Section>
        );
      })}
    </List>
  );
}
