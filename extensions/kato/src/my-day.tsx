import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { katoApi } from "./api";
import { formatDueDate, formatMeetingTime, groupTasks } from "./dates";
import { ErrorActions } from "./error-actions";
import { NotificationActions } from "./notification-actions";
import { accessTokenOptions } from "./oauth";
import { TaskActions } from "./task-actions";
import type {
  KatoNotification,
  ScheduleItem,
  Task,
  TaskDetail,
  TaskStatus,
} from "./types";
import { MeetingActions } from "./upcoming-meetings";

type DayView = "overview" | "meetings" | "tasks" | "notifications" | "issues";

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function minutes(value: number | null) {
  if (!value) return "None";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function descriptionPreview(value: string | null, limit = 420) {
  if (!value?.trim()) return "_No description_";
  const clean = value
    .trim()
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "_[Image attachment]_")
    .replace(/\n{3,}/g, "\n\n");
  if (clean.length <= limit)
    return `${clean}\n\n_Use View More to see comments, files, and activity._`;
  const excerpt = clean
    .slice(0, limit)
    .replace(/\s+\S*$/, "")
    .trim();
  return `${excerpt}…\n\n_Use View More to read the complete task._`;
}

function priorityColor(priority: Task["priority"]) {
  if (priority === "urgent") return Color.Red;
  if (priority === "high") return Color.Orange;
  if (priority === "medium") return Color.Yellow;
  if (priority === "low") return Color.Blue;
  return Color.SecondaryText;
}

function TaskPreview({
  task,
  detail,
  statuses,
}: {
  task: Task;
  detail?: TaskDetail;
  statuses: TaskStatus[];
}) {
  const status = statuses.find((item) => item.slug === task.status);
  return (
    <List.Item.Detail
      markdown={`## ${task.title}\n\n${descriptionPreview(detail?.description ?? task.description)}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Task">
            <List.Item.Detail.Metadata.TagList.Item
              text={status?.name ?? titleCase(task.status)}
              color={status?.color}
              icon={Icon.CircleProgress}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text={titleCase(task.priority)}
              color={priorityColor(task.priority)}
              icon={Icon.Flag}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Due"
            text={task.dueDate ? dateTime(task.dueDate) : "No due date"}
            icon={Icon.Calendar}
          />
          <List.Item.Detail.Metadata.Label
            title="Estimate"
            text={minutes(task.estimatedTime)}
            icon={Icon.Clock}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Assignees"
            text={
              detail?.assigneeProfiles
                .map((profile) => profile.name)
                .join(", ") || `${task.assignees.length} assigned`
            }
            icon={Icon.Person}
          />
          {detail?.section ? (
            <List.Item.Detail.Metadata.Label
              title="Section"
              text={`${detail.section.recordTitle} · ${detail.section.name ?? "Ungrouped"}`}
              icon={Icon.Hashtag}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Linked Records"
            text={
              detail
                ? detail.linkedRecords
                    .map((record) => record.title)
                    .join(", ") || "None"
                : String(task.linkedRecordCount)
            }
            icon={Icon.Link}
          />
          <List.Item.Detail.Metadata.Label
            title="Files"
            text={String(detail?.files.length ?? task.fileCount)}
            icon={Icon.Paperclip}
          />
          <List.Item.Detail.Metadata.Label
            title="Comments"
            text={detail ? String(detail.comments.length) : "Loading…"}
            icon={Icon.Message}
          />
          <List.Item.Detail.Metadata.Link
            title="Kato"
            target={task.webUrl}
            text="Open Task"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function MeetingPreview({ meeting }: { meeting: ScheduleItem }) {
  const duration = Math.max(
    0,
    Math.round(
      (Date.parse(meeting.endTime) - Date.parse(meeting.startTime)) / 60_000,
    ),
  );
  return (
    <List.Item.Detail
      markdown={`# ${meeting.title}\n\n${meeting.description || "_No agenda or description_"}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Starts"
            text={dateTime(meeting.startTime)}
            icon={Icon.Calendar}
          />
          <List.Item.Detail.Metadata.Label
            title="Duration"
            text={meeting.isAllDay ? "All day" : minutes(duration)}
            icon={Icon.Clock}
          />
          {meeting.location ? (
            <List.Item.Detail.Metadata.Label
              title="Location"
              text={meeting.location}
              icon={Icon.Pin}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Visibility"
            text={titleCase(meeting.detailLevel)}
            icon={Icon.Eye}
          />
          {meeting.calendarName ? (
            <List.Item.Detail.Metadata.Label
              title="Calendar"
              text={meeting.calendarName}
            />
          ) : null}
          {meeting.joinUrl ? (
            <List.Item.Detail.Metadata.Link
              title="Conference"
              target={meeting.joinUrl}
              text="Join Meeting"
            />
          ) : null}
          <List.Item.Detail.Metadata.Link
            title="Kato"
            target={meeting.webUrl}
            text="Open Meeting"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function NotificationPreview({
  notification,
}: {
  notification: KatoNotification;
}) {
  return (
    <List.Item.Detail
      markdown={`# ${notification.title}\n\n${notification.body || "_No additional details_"}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Category"
            text={titleCase(notification.category)}
            icon={Icon.Bell}
          />
          <List.Item.Detail.Metadata.Label
            title="From"
            text={notification.actor?.name ?? "Kato"}
            icon={Icon.Person}
          />
          <List.Item.Detail.Metadata.Label
            title="Received"
            text={dateTime(notification.createdAt)}
            icon={Icon.Clock}
          />
          <List.Item.Detail.Metadata.Label
            title="Related To"
            text={titleCase(notification.entityType)}
            icon={Icon.Link}
          />
          {notification.webUrl ? (
            <List.Item.Detail.Metadata.Link
              title="Kato"
              target={notification.webUrl}
              text="Open Related Item"
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function MyDayCommand() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<ScheduleItem[]>([]);
  const [notifications, setNotifications] = useState<KatoNotification[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [view, setView] = useState<DayView>("overview");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [taskDetails, setTaskDetails] = useState<Record<string, TaskDetail>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function load() {
    setIsLoading(true);
    setError(undefined);
    try {
      const [brief, nextStatuses] = await Promise.all([
        katoApi.brief(),
        katoApi.statuses(),
      ]);
      setTasks(brief.tasks);
      setMeetings(brief.meetings);
      setNotifications(brief.notifications);
      setIssues(brief.integrationIssues.map((issue) => issue.message));
      setStatuses(nextStatuses);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load My Day",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => void load(), []);
  const selectedTaskId = selectedItemId?.startsWith("task:")
    ? selectedItemId.slice("task:".length)
    : undefined;

  useEffect(() => {
    if (!isShowingDetail || !selectedTaskId || taskDetails[selectedTaskId])
      return;
    let active = true;
    void katoApi
      .task(selectedTaskId)
      .then((detail) => {
        if (active)
          setTaskDetails((current) => ({
            ...current,
            [selectedTaskId]: detail,
          }));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isShowingDetail, selectedTaskId, taskDetails]);

  const detailToggle = {
    isShowing: isShowingDetail,
    onToggle: () => setIsShowingDetail((current) => !current),
  };

  const groupedTasks = useMemo(() => groupTasks(tasks), [tasks]);
  const taskSections = [
    { title: "Overdue", tasks: groupedTasks.Overdue },
    { title: "Due Today", tasks: groupedTasks.Today },
  ];
  const dayTasks = [...groupedTasks.Overdue, ...groupedTasks.Today];
  const now = Date.now();
  const showMeetings = view === "overview" || view === "meetings";
  const showTasks = view === "overview" || view === "tasks";
  const showNotifications = view === "overview" || view === "notifications";
  const showIssues = view === "overview" || view === "issues";
  const visibleCount =
    (showMeetings ? meetings.length : 0) +
    (showTasks ? dayTasks.length : 0) +
    (showNotifications ? notifications.length : 0) +
    (showIssues ? issues.length : 0);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Filter meetings, tasks, notifications, or issues…"
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Choose My Day view"
          value={view}
          onChange={(value) => {
            setView(value as DayView);
            setIsShowingDetail(false);
          }}
        >
          <List.Dropdown.Item
            title={`Overview (${visibleCount})`}
            value="overview"
            icon={Icon.Sun}
          />
          <List.Dropdown.Item
            title={`Meetings (${meetings.length})`}
            value="meetings"
            icon={Icon.Calendar}
          />
          <List.Dropdown.Item
            title={`Tasks (${dayTasks.length})`}
            value="tasks"
            icon={Icon.CheckCircle}
          />
          <List.Dropdown.Item
            title={`Notifications (${notifications.length})`}
            value="notifications"
            icon={Icon.Bell}
          />
          <List.Dropdown.Item
            title={`Issues (${issues.length})`}
            value="issues"
            icon={Icon.Warning}
          />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Could not load My Day"
          description={error}
          icon={Icon.Warning}
          actions={
            <ErrorActions command="my-day" onRetry={() => void load()} />
          }
        />
      ) : null}
      {!error && !isLoading && visibleCount === 0 ? (
        <List.EmptyView
          title={view === "overview" ? "Your day is clear" : `No ${view}`}
          description="Nothing in this view needs your attention."
          icon={Icon.Sun}
        />
      ) : null}

      {showMeetings && meetings.length ? (
        <List.Section title="Meetings" subtitle={String(meetings.length)}>
          {meetings.map((meeting) => {
            const happening =
              Date.parse(meeting.startTime) <= now &&
              Date.parse(meeting.endTime) >= now;
            return (
              <List.Item
                id={`meeting:${meeting.source}:${meeting.id}`}
                key={`${meeting.source}-${meeting.id}`}
                icon={{
                  source: meeting.joinUrl ? Icon.Video : Icon.Calendar,
                  tintColor: happening ? Color.Red : Color.Purple,
                }}
                title={meeting.title}
                subtitle={
                  happening ? "Happening now" : (meeting.location ?? undefined)
                }
                accessories={[{ text: formatMeetingTime(meeting) }]}
                detail={<MeetingPreview meeting={meeting} />}
                actions={
                  <MeetingActions
                    meeting={meeting}
                    detailToggle={detailToggle}
                  />
                }
              />
            );
          })}
        </List.Section>
      ) : null}

      {showTasks
        ? taskSections.map((section) =>
            section.tasks.length ? (
              <List.Section
                key={section.title}
                title={section.title}
                subtitle={String(section.tasks.length)}
              >
                {section.tasks.map((task) => (
                  <List.Item
                    id={`task:${task.id}`}
                    key={task.id}
                    icon={{
                      source: Icon.CheckCircle,
                      tintColor:
                        section.title === "Overdue" ? Color.Red : Color.Blue,
                    }}
                    title={task.title}
                    accessories={[
                      ...(!isShowingDetail && task.dueDate
                        ? [{ text: formatDueDate(task.dueDate) ?? "" }]
                        : []),
                      ...(task.priority !== "no_priority"
                        ? [{ tag: titleCase(task.priority) }]
                        : []),
                      ...(task.fileCount
                        ? [
                            {
                              icon: Icon.Paperclip,
                              text: String(task.fileCount),
                            },
                          ]
                        : []),
                      {
                        icon: Icon.Person,
                        text: String(task.assignees.length),
                      },
                    ]}
                    detail={
                      <TaskPreview
                        task={task}
                        detail={taskDetails[task.id]}
                        statuses={statuses}
                      />
                    }
                    actions={
                      <TaskActions
                        task={task}
                        statuses={statuses}
                        detailsActionTitle="View More"
                        detailToggle={detailToggle}
                        onBeforeComplete={() =>
                          setTasks((current) =>
                            current.filter((item) => item.id !== task.id),
                          )
                        }
                        onCompleteError={() =>
                          setTasks((current) =>
                            current.some((item) => item.id === task.id)
                              ? current
                              : [...current, task],
                          )
                        }
                        onUpdated={(updated) => {
                          setTasks((current) =>
                            current.map((item) =>
                              item.id === updated.id ? updated : item,
                            ),
                          );
                          setTaskDetails((current) =>
                            current[updated.id]
                              ? {
                                  ...current,
                                  [updated.id]: {
                                    ...current[updated.id],
                                    ...updated,
                                  },
                                }
                              : current,
                          );
                        }}
                      />
                    }
                  />
                ))}
              </List.Section>
            ) : null,
          )
        : null}

      {showNotifications && notifications.length ? (
        <List.Section
          title="Notifications"
          subtitle={String(notifications.length)}
        >
          {notifications.map((notification) => (
            <List.Item
              id={`notification:${notification.id}`}
              key={notification.id}
              icon={{ source: Icon.Bell, tintColor: Color.Orange }}
              title={notification.title}
              subtitle={notification.actor?.name ?? undefined}
              accessories={[{ text: dateTime(notification.createdAt) }]}
              detail={<NotificationPreview notification={notification} />}
              actions={
                <NotificationActions
                  notification={notification}
                  detailToggle={detailToggle}
                  onRead={() =>
                    setNotifications((current) =>
                      current.filter((item) => item.id !== notification.id),
                    )
                  }
                  onUnread={() =>
                    setNotifications((current) =>
                      current.some((item) => item.id === notification.id)
                        ? current
                        : [notification, ...current],
                    )
                  }
                  onDismissed={() =>
                    setNotifications((current) =>
                      current.filter((item) => item.id !== notification.id),
                    )
                  }
                />
              }
            />
          ))}
        </List.Section>
      ) : null}

      {showIssues && issues.length ? (
        <List.Section
          title="Integration Issues"
          subtitle={String(issues.length)}
        >
          {issues.map((issue, index) => (
            <List.Item
              id={`issue:${index}`}
              key={`${issue}-${index}`}
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
              title={issue}
              detail={
                <List.Item.Detail
                  markdown={`# Integration needs attention\n\n${issue}\n\nOpen Kato to reconnect or review the affected integration.`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={isShowingDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={
                      isShowingDetail
                        ? { modifiers: ["cmd"], key: "d" }
                        : undefined
                    }
                    onAction={detailToggle.onToggle}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

export default withAccessToken(accessTokenOptions)(MyDayCommand);
