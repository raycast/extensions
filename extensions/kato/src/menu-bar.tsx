import {
  Color,
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
} from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useMemo } from "react";
import { katoApi } from "./api";
import { formatMeetingTime } from "./dates";
import { taskPriorityIcon } from "./icons";
import { createMenuBarModel } from "./menu-bar-model";
import { accessTokenOptions } from "./oauth";

const KATO_ICON = "mask-gradient.png";

function launch(name: string) {
  return launchCommand({ name, type: LaunchType.UserInitiated });
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function uniqueTitle(items: Array<{ title: string }>, index: number): string {
  const title = items[index].title;
  const occurrence = items
    .slice(0, index + 1)
    .filter((item) => item.title === title).length;
  return occurrence === 1 ? title : `${title} (${occurrence})`;
}

function KatoMenuBarCommand() {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    () => katoApi.brief(),
    [],
    { onError: () => undefined },
  );
  const model = useMemo(
    () => (data ? createMenuBarModel(data) : undefined),
    [data],
  );
  const nextMeeting = model?.nextMeeting;
  const meetingTarget = nextMeeting
    ? (nextMeeting.joinUrl ?? nextMeeting.externalUrl ?? nextMeeting.webUrl)
    : undefined;
  const tooltip = model
    ? model.attentionCount
      ? `${model.attentionCount} item${model.attentionCount === 1 ? "" : "s"} need attention`
      : "Kato · You’re all caught up"
    : "Kato My Day";

  return (
    <MenuBarExtra
      icon={KATO_ICON}
      title={model?.menuBarTitle}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {error ? (
        <MenuBarExtra.Section title="Status">
          <MenuBarExtra.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title="Could Not Refresh Kato"
            subtitle={error.message}
          />
        </MenuBarExtra.Section>
      ) : null}

      {nextMeeting ? (
        <MenuBarExtra.Section
          title={model?.currentMeeting ? "Happening Now" : "Up Next"}
        >
          <MenuBarExtra.Item
            icon={nextMeeting.joinUrl ? Icon.Video : Icon.Calendar}
            title={nextMeeting.title}
            subtitle={
              model?.currentMeeting
                ? "Happening now"
                : formatMeetingTime(nextMeeting)
            }
            onAction={() => void open(meetingTarget!)}
          />
          <MenuBarExtra.Item
            icon={Icon.Calendar}
            title="View Upcoming Meetings"
            onAction={() => void launch("upcoming-meetings")}
          />
        </MenuBarExtra.Section>
      ) : null}

      {model ? (
        <MenuBarExtra.Section title="Today">
          <MenuBarExtra.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Overdue Tasks"
            subtitle={String(model.overdueTasks.length)}
            onAction={() => void launch("my-day")}
          />
          <MenuBarExtra.Item
            icon={Icon.CheckCircle}
            title="Due Today"
            subtitle={String(model.dueTodayTasks.length)}
            onAction={() => void launch("my-day")}
          />
          {model.featuredTasks.map((task, index) => (
            <MenuBarExtra.Item
              key={task.id}
              icon={taskPriorityIcon(task.priority)}
              title={uniqueTitle(model.featuredTasks, index)}
              subtitle={`${model.overdueTasks.some((item) => item.id === task.id) ? "Overdue" : "Today"} · ${titleCase(task.priority)}`}
              onAction={() => void open(task.webUrl)}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {model?.unreadNotifications.length ? (
        <MenuBarExtra.Section title="Notifications">
          {model.unreadNotifications.slice(0, 3).map((notification, index) => (
            <MenuBarExtra.Item
              key={notification.id}
              icon={Icon.Bell}
              title={uniqueTitle(model.unreadNotifications.slice(0, 3), index)}
              subtitle={notification.body ?? undefined}
              onAction={() =>
                void (notification.webUrl
                  ? open(notification.webUrl)
                  : launch("notifications"))
              }
            />
          ))}
          <MenuBarExtra.Item
            icon={Icon.AppWindowList}
            title="View All Notifications"
            subtitle={String(model.unreadNotifications.length)}
            onAction={() => void launch("notifications")}
          />
        </MenuBarExtra.Section>
      ) : null}

      {model?.integrationIssues.length ? (
        <MenuBarExtra.Section title="Workspace Health">
          {model.integrationIssues.map((issue) => (
            <MenuBarExtra.Item
              key={issue.id}
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
              title={issue.title}
              subtitle={issue.message}
              onAction={() => void launch("my-day")}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section title="Quick Actions">
        <MenuBarExtra.Item
          icon={Icon.CheckList}
          title="Open My Day"
          onAction={() => void launch("my-day")}
        />
        <MenuBarExtra.Item
          icon={Icon.Plus}
          title="Create Task"
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => void launch("create-task")}
        />
        <MenuBarExtra.Item
          icon={Icon.MagnifyingGlass}
          title="Search Workspace"
          onAction={() => void launch("search-kato")}
        />
        <MenuBarExtra.Item
          icon={Icon.AppWindow}
          title="Current Workspace"
          onAction={() => void launch("connection")}
        />
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => void revalidate()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default withAccessToken(accessTokenOptions)(KatoMenuBarCommand);
