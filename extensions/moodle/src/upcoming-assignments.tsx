import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getAssignments, getMoodlePrefs } from "./api/moodle";
import { addAssignmentToCalendar } from "./utils/calendar";
import {
  formatDateTime,
  formatRelativeDueDate,
  stripHtml,
} from "./utils/formatters";

export default function UpcomingAssignmentsCommand() {
  const { moodleUrl, calendarName } = getMoodlePrefs();
  const [filter, setFilter] = useState<string>("upcoming");
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);

  const {
    data: assignments,
    isLoading,
    error,
    revalidate,
  } = usePromise(getAssignments, [], {
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load assignments",
        message: err.message,
      });
    },
  });

  const nowSeconds = Math.floor(Date.now() / 1000);
  const oneWeekSeconds = 7 * 24 * 60 * 60;

  const filteredAssignments = assignments?.filter((a) => {
    if (!a.duedate) return filter === "all";
    const isOverdue = a.duedate < nowSeconds;

    if (filter === "upcoming") {
      return !isOverdue || nowSeconds - a.duedate < 86400 * 2; // include recently past within 48h
    }
    if (filter === "week") {
      return (
        a.duedate >= nowSeconds && a.duedate <= nowSeconds + oneWeekSeconds
      );
    }
    if (filter === "overdue") {
      return isOverdue;
    }
    return true; // "all"
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Filter upcoming assignments and deadlines..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Deadlines"
          value={filter}
          onChange={setFilter}
        >
          <List.Dropdown.Item title="Upcoming Deadlines" value="upcoming" />
          <List.Dropdown.Item title="Due This Week" value="week" />
          <List.Dropdown.Item title="Overdue" value="overdue" />
          <List.Dropdown.Item title="All Assignments" value="all" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could not load assignments"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Retry"
                icon={Icon.RotateAntiClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : filteredAssignments && filteredAssignments.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="No Deadlines Found"
          description={
            filter === "upcoming"
              ? "You have no upcoming assignment deadlines right now! Great job!"
              : "No assignments match the selected filter."
          }
        />
      ) : (
        filteredAssignments?.map((assignment) => {
          const assignUrl = `${moodleUrl}/mod/assign/view.php?id=${assignment.cmid}`;
          const dueStatus = formatRelativeDueDate(assignment.duedate);

          let tintColor = Color.SecondaryText;
          if (dueStatus.isOverdue) tintColor = Color.Red;
          else if (dueStatus.isUrgent) tintColor = Color.Orange;
          else if (assignment.duedate) tintColor = Color.Green;

          return (
            <List.Item
              key={assignment.id}
              icon={{
                source: dueStatus.isOverdue
                  ? Icon.ExclamationMark
                  : Icon.Calendar,
                tintColor,
              }}
              title={assignment.name}
              subtitle={isShowingDetail ? undefined : assignment.courseName}
              accessories={
                isShowingDetail
                  ? undefined
                  : [
                      {
                        tag: {
                          value: dueStatus.text,
                          color: tintColor,
                        },
                      },
                      {
                        text: formatDateTime(assignment.duedate),
                      },
                    ]
              }
              detail={
                <List.Item.Detail
                  markdown={`# ${assignment.name}\n\n**Course**: ${assignment.courseName || "Unknown"}\n\n**Due Date**: ${formatDateTime(assignment.duedate)} (${dueStatus.text})\n\n---\n\n### Instructions\n${stripHtml(assignment.intro) || "*No additional instructions provided.*"}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Course"
                        text={assignment.courseName || "Unknown"}
                      />
                      <List.Item.Detail.Metadata.TagList title="Status">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={dueStatus.text}
                          color={tintColor}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="Due Date"
                        text={formatDateTime(assignment.duedate)}
                      />
                      {assignment.cutoffdate ? (
                        <List.Item.Detail.Metadata.Label
                          title="Cut-off Date"
                          text={formatDateTime(assignment.cutoffdate)}
                        />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Assignment Actions">
                    <Action
                      title="Add to macOS Calendar"
                      icon={Icon.Calendar}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={async () => {
                        await addAssignmentToCalendar({
                          title: `[${assignment.courseName || "Moodle"}] ${assignment.name}`,
                          dueDate: assignment.duedate,
                          description: stripHtml(assignment.intro),
                          url: assignUrl,
                          calendarName,
                        });
                      }}
                    />
                    <Action.OpenInBrowser
                      title="Open Assignment in Browser"
                      url={assignUrl}
                    />
                    <Action
                      title={isShowingDetail ? "Hide Details" : "Show Details"}
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => setIsShowingDetail((prev) => !prev)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Clipboard & Navigation">
                    <Action.CopyToClipboard
                      title="Copy Assignment Link"
                      content={assignUrl}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Deadline Summary"
                      content={`${assignment.name} (${assignment.courseName}) - Due: ${formatDateTime(assignment.duedate)}`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action
                      title="Open Extension Preferences"
                      icon={Icon.Gear}
                      onAction={openExtensionPreferences}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
