import { useState } from "react";
import { Icon, List, showToast, Toast, Action, ActionPanel } from "@raycast/api";
import { useCourseAssignments } from "./hooks/useCourseAssignments";

export default function CourseAssignments({ course }: { course: { name: string; id: string } }) {
  const { assignments, isLoading, error } = useCourseAssignments(course.id);
  const [filter, setFilter] = useState<string>("upcoming");

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch assignments", error.message);
  }

  // Function to determine the icon based on assignment properties
  function getIcon(dueAt: string | null) {
    if (!dueAt) return { source: Icon.Document }; // Default icon if no due date

    const dueDate = new Date(dueAt);
    const isDueSoon = dueDate.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000; // Due in the next 7 days

    return isDueSoon
      ? { source: Icon.Clock } // Clock for due soon
      : { source: Icon.Document }; // Default icon
  }

  const now = new Date();

  const filteredAssignments = assignments
    .map((assignment) => ({
      ...assignment,
      icon: getIcon(assignment.dueAt),
      dueDate: assignment.dueAt ? new Date(assignment.dueAt) : null,
    }))
    .filter((assignment) => {
      if (filter === "upcoming") return assignment.dueDate && assignment.dueDate > now;
      if (filter === "past") return assignment.dueDate && assignment.dueDate <= now;
      return true; // Show all
    });

  return (
    <List
      navigationTitle={`Assignments for ${course.name}`}
      isLoading={isLoading}
      searchBarPlaceholder="Search assignments..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Assignments" storeValue onChange={(newValue) => setFilter(newValue)}>
          <List.Dropdown.Item title="Upcoming Assignments" value="upcoming" />
          <List.Dropdown.Item title="Past Assignments" value="past" />
          <List.Dropdown.Item title="All Assignments" value="all" />
        </List.Dropdown>
      }
    >
      {filteredAssignments.map((assignment) => (
        <List.Item
          key={assignment.id}
          icon={assignment.icon}
          title={assignment.name}
          accessories={[{ tag: assignment.formattedDueAt }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={assignment.htmlUrl} />
              <Action.CopyToClipboard title="Copy Assignment Link" content={assignment.htmlUrl} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
