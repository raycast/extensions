import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { useAppData } from "./lib/hooks/useAppData";
import { useTemplates } from "./lib/hooks/useTemplates";
import { CourseForm } from "./lib/components/CourseForm";
import { StatisticsView } from "./lib/components/StatisticsView";
import { Course, ScheduleGroup } from "./lib/types";
import { formatTime, resolveRaycastColor } from "./lib/schedule-utils";
import { getIcon } from "./lib/constants";
import { detectConflicts } from "./lib/conflict-detection";
import { exportToFile, importFromFile } from "./lib/storage";
import { computeStats } from "./lib/stats-utils";
import { CreateGroupForm, RenameGroupForm } from "./lib/components/GroupForms";

type FilterMode = "all" | "ephemeral" | "active" | "conflicts";

function slotSummary(course: Course): string {
  if (course.schedules.length === 0) {
    return "No schedule";
  }

  const summaries = course.schedules.map((slot) => {
    const days = slot.days.map((d) => d.slice(0, 3)).join("/");
    const time = `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
    return `${days} ${time}`;
  });

  return summaries.join("; ");
}

export default function ManageSchedules() {
  const {
    data,
    isLoading,
    activeGroup,
    createGroup,
    deleteGroup,
    renameGroup,
    archiveGroup,
    unarchiveGroup,
    setActiveGroup,
    addCourse,
    updateCourse,
    deleteCourse,
    duplicateCourse,
    refreshData,
    importData,
  } = useAppData();
  const { templates } = useTemplates();
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const handleCreateGroup = () => {
    push(
      <CreateGroupForm
        onSubmit={async (name) => {
          try {
            await createGroup(name);
            await showToast({ style: Toast.Style.Success, title: "Group created" });
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to create group",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }}
      />,
    );
  };

  const handleAddCourse = (group: ScheduleGroup, isEphemeral = false) => {
    push(
      <CourseForm
        isEphemeral={isEphemeral}
        existingCourses={group.courses}
        templates={templates}
        onSubmit={async (course) => {
          try {
            await addCourse(group.id, course);
            await showToast({
              style: Toast.Style.Success,
              title: isEphemeral ? "Ephemeral course added" : "Course added",
            });
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to add course",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }}
      />,
    );
  };

  const handleEditCourse = (group: ScheduleGroup, course: Course) => {
    push(
      <CourseForm
        initialValues={course}
        existingCourses={group.courses}
        onSubmit={async (updated) => {
          try {
            await updateCourse(group.id, { ...updated, id: course.id });
            await showToast({ style: Toast.Style.Success, title: "Course updated" });
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to update course",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }}
      />,
    );
  };

  const handleDeleteGroup = async (group: ScheduleGroup) => {
    const confirmed = await confirmAlert({
      title: `Delete "${group.name}"?`,
      message: `This will permanently delete the group and all ${group.courses.length} courses in it. This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteGroup(group.id);
        await showToast({ style: Toast.Style.Success, title: "Group deleted" });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete group",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleDeleteCourse = async (group: ScheduleGroup, course: Course) => {
    const confirmed = await confirmAlert({
      title: `Delete "${course.title}"?`,
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteCourse(group.id, course.id);
        await showToast({ style: Toast.Style.Success, title: "Course deleted" });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete course",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  const handleSetActive = async (groupId: string) => {
    try {
      await setActiveGroup(groupId);
      await showToast({ style: Toast.Style.Success, title: "Active group set" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set active group",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleRenameGroup = (group: ScheduleGroup) => {
    push(
      <RenameGroupForm
        group={group}
        onSubmit={async (newName) => {
          try {
            await renameGroup(group.id, newName);
            await showToast({ style: Toast.Style.Success, title: "Group renamed" });
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to rename group",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }}
      />,
    );
  };

  const prefs = getPreferenceValues();

  const handleExport = async () => {
    try {
      const dir = prefs.exportPath ?? "~/Downloads";
      const filePath = await exportToFile(data, dir);
      await showToast({
        style: Toast.Style.Success,
        title: "Export Successful",
        message: `Saved to ${filePath}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleImport = async () => {
    // Handle both string and object preference values
    const importPathValue = prefs.importFilePath;
    let importPath: string | undefined;

    if (typeof importPathValue === "string") {
      importPath = importPathValue;
    } else if (importPathValue && typeof importPathValue === "object") {
      // Raycast file picker might return an object with path property
      importPath = (importPathValue as { path?: string }).path;
    }

    if (!importPath || !importPath.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: "No import file path configured. Set it in Extension Settings (⌘,)",
      });
      return;
    }

    const trimmedPath = importPath.trim();

    try {
      const imported = await importFromFile(trimmedPath);
      const confirmed = await confirmAlert({
        title: "Import Schedules",
        message: `Found ${imported.groups.length} group(s) to import. This will merge with your existing data. Continue?`,
        primaryAction: {
          title: "Import",
          style: Alert.ActionStyle.Default,
        },
      });
      if (confirmed) {
        // Merge: add groups from import that don't exist locally (by name)
        const existingNames = new Set(data.groups.map((g) => g.name));
        const newGroups = imported.groups.filter((g) => !existingNames.has(g.name));
        await importData({
          ...data,
          groups: [...data.groups, ...newGroups],
        });
        await refreshData();
        await showToast({
          style: Toast.Style.Success,
          title: "Import Successful",
          message: `${newGroups.length} group(s) imported`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const searchTextLower = searchText.toLowerCase();

  const filteredGroups = data.groups
    .filter((g) => (showArchived ? g.archived : !g.archived))
    .filter(
      (group) =>
        group.name.toLowerCase().includes(searchTextLower) ||
        group.courses.some(
          (course) =>
            course.title.toLowerCase().includes(searchTextLower) ||
            course.courseCode?.toLowerCase().includes(searchTextLower),
        ),
    )
    // Only show the currently selected group in the dropdown
    .filter((group) => group.id === (data.activeGroupId || data.groups[0]?.id));

  const getFilteredCourses = (group: ScheduleGroup) => {
    let courses = group.courses;

    switch (filterMode) {
      case "ephemeral":
        courses = courses.filter((c) => c.ephemeral);
        break;
      case "active":
        if (activeGroup && group.id !== activeGroup.id) {
          courses = [];
        }
        break;
      case "conflicts":
        courses = courses.filter((course) => {
          const otherCourses = group.courses.filter((c) => c.id !== course.id);
          const conflicts = detectConflicts(course.schedules, otherCourses, course.id);
          return conflicts.length > 0;
        });
        break;
    }

    return courses;
  };

  const globalActions = (
    <>
      <Action
        title="Create New Group"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        onAction={handleCreateGroup}
      />
      <Action
        title="Import from File"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onAction={handleImport}
      />
      <Action
        title="Export to File"
        icon={Icon.Upload}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        onAction={handleExport}
      />
      <Action
        title="View Statistics"
        icon={Icon.BarChart}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        onAction={async () => {
          if (activeGroup) {
            const stats = computeStats(activeGroup.courses);
            push(<StatisticsView stats={stats} groupName={activeGroup.name} />);
          } else {
            await showToast({
              style: Toast.Style.Failure,
              title: "No Active Group",
              message: "Please set an active group first",
            });
          }
        }}
      />
      <Action
        title={showArchived ? "Show Active Groups" : "Show Archived Groups"}
        icon={Icon.Folder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        onAction={() => setShowArchived((v) => !v)}
      />
    </>
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Active Group"
          value={data.activeGroupId || data.groups[0]?.id || ""}
          onChange={(value) => handleSetActive(value)}
        >
          {data.groups.map((group) => (
            <List.Dropdown.Item
              key={group.id}
              title={group.name}
              value={group.id}
              icon={group.id === data.activeGroupId ? Icon.CheckCircle : Icon.Circle}
            />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Create New Group"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            onAction={handleCreateGroup}
          />
          <Action
            title={showArchived ? "Show Active Groups" : "Show Archived Groups"}
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => setShowArchived((v) => !v)}
          />
          <Action
            title="Refresh Data"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={refreshData}
          />
          <ActionPanel.Section title="Filter Courses">
            <Action
              title="Show All Courses"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={() => setFilterMode("all")}
            />
            <Action
              title="Show Ephemeral Only"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={() => setFilterMode("ephemeral")}
            />
            <Action
              title="Show Active Group Only"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
              onAction={() => setFilterMode("active")}
            />
            <Action
              title="Show Conflicts Only"
              icon={Icon.ExclamationMark}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => setFilterMode("conflicts")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Global Actions">{globalActions}</ActionPanel.Section>
        </ActionPanel>
      }
    >
      {data.groups.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No Schedule Groups"
          description="Create your first group to start managing courses"
          actions={
            <ActionPanel>
              <Action
                title="Create New Group"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                onAction={handleCreateGroup}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredGroups.map((group) => {
          const filteredCourses = getFilteredCourses(group);
          return (
            <List.Section
              key={group.id}
              title={group.name}
              subtitle={`${filteredCourses.length} course${filteredCourses.length !== 1 ? "s" : ""}${
                group.id === data.activeGroupId ? " (Active)" : ""
              }${filterMode !== "all" ? ` · Filter: ${filterMode}` : ""}`}
            >
              <List.Item
                title={group.name}
                subtitle={group.id === data.activeGroupId ? "✓ Active Group · View Options" : "View Options"}
                icon={{
                  source: group.id === data.activeGroupId ? Icon.CheckCircle : Icon.Folder,
                  tintColor: group.id === data.activeGroupId ? Color.Green : Color.SecondaryText,
                }}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={`${group.name}`}>
                      <Action
                        title="Add Course"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        onAction={() => handleAddCourse(group)}
                      />
                      <Action
                        title="Add Ephemeral Course"
                        icon={Icon.Clock}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                        onAction={() => handleAddCourse(group, true)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {group.id !== data.activeGroupId && (
                        <Action
                          title="Set as Active Group"
                          icon={Icon.CheckCircle}
                          onAction={() => handleSetActive(group.id)}
                        />
                      )}
                      <Action title="Rename Group" icon={Icon.Pencil} onAction={() => handleRenameGroup(group)} />
                      <Action
                        title={group.archived ? "Unarchive Group" : "Archive Group"}
                        icon={Icon.Folder}
                        onAction={() => (group.archived ? unarchiveGroup(group.id) : archiveGroup(group.id))}
                      />
                      <Action
                        title="Delete Group"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDeleteGroup(group)}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Global Actions">{globalActions}</ActionPanel.Section>
                  </ActionPanel>
                }
              />
              {filteredCourses.length === 0 ? (
                <List.Item
                  title="No courses in this group"
                  icon={{ source: Icon.Minus, tintColor: Color.SecondaryText }}
                  actions={
                    <ActionPanel>
                      <Action title="Add Course" icon={Icon.Plus} onAction={() => handleAddCourse(group)} />
                    </ActionPanel>
                  }
                />
              ) : (
                filteredCourses.map((course) => (
                  <List.Item
                    key={course.id}
                    title={course.title}
                    subtitle={slotSummary(course)}
                    icon={
                      course.ephemeral
                        ? { source: Icon.Clock, tintColor: Color.Yellow }
                        : { source: getIcon(course.icon) ?? Icon.Book, tintColor: resolveRaycastColor(course.color) }
                    }
                    accessories={[
                      ...(course.courseCode ? [{ tag: course.courseCode, icon: Icon.TextDocument }] : []),
                      ...(course.color
                        ? [{ icon: { source: Icon.Circle, tintColor: resolveRaycastColor(course.color) } }]
                        : []),
                    ]}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Edit Course"
                          icon={Icon.Pencil}
                          onAction={() => handleEditCourse(group, course)}
                        />
                        <Action
                          title="Duplicate Course"
                          icon={Icon.CopyClipboard}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={async () => {
                            try {
                              await duplicateCourse(group.id, course);
                              await showToast({ style: Toast.Style.Success, title: "Course duplicated" });
                            } catch (error) {
                              await showToast({
                                style: Toast.Style.Failure,
                                title: "Failed to duplicate",
                                message: error instanceof Error ? error.message : "Unknown error",
                              });
                            }
                          }}
                        />
                        <Action
                          title="Delete Course"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                          onAction={() => handleDeleteCourse(group, course)}
                        />
                        <ActionPanel.Section>
                          <Action
                            title="Add Course"
                            icon={Icon.Plus}
                            shortcut={{ modifiers: ["cmd"], key: "n" }}
                            onAction={() => handleAddCourse(group)}
                          />
                          <Action
                            title="Add Ephemeral Course"
                            icon={Icon.Clock}
                            onAction={() => handleAddCourse(group, true)}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                ))
              )}
            </List.Section>
          );
        })
      )}
    </List>
  );
}
