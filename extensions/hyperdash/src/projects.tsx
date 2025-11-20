import { Action, ActionPanel, Color, Icon, List, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { scanVault, type Note, sortByMtimeDesc, updateNoteStatus, updateNoteDate } from "./utils";
import { readBasesTag } from "./bases";

type Prefs = {
  projectPath: string;
  basesProjectFile: string;
};

function formatDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
      return `${monthStr} ${day}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function isOverdue(dateStr: string): boolean {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dueDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    }
    return false;
  } catch {
    return false;
  }
}

function isToday(dateStr: string): boolean {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dueDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }
    return false;
  } catch {
    return false;
  }
}

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [effectiveProject, setEffectiveProject] = useState<string>("");

  async function load() {
    try {
      setIsLoading(true);

      if (!prefs.projectPath?.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "Set Project Path in Preferences" });
        setNotes([]);
        return;
      }

      if (!prefs.basesProjectFile?.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "Set Bases Project File in Preferences" });
        setNotes([]);
        return;
      }

      const projectFromBases = await readBasesTag(prefs.basesProjectFile.trim());

      if (!projectFromBases) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No tags found in Project file",
          message: "Check that your project.base file contains tags.containsAny() or tags.contains()"
        });
        setNotes([]);
        return;
      }

      const projectTags = projectFromBases.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

      setEffectiveProject(projectTags.join(', '));

      const scanned = await scanVault({
        vaultPath: prefs.projectPath.trim(),
        todoTags: [], // Empty array to not match any todos
        projectTags
      });

      setNotes(scanned);
    } catch (e: any) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load", message: String(e?.message ?? e) });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter projects by search text
  const filteredProjects = useMemo(() => {
    const projects = notes.filter((n) => n.hasProjectTag);
    if (!searchText.trim()) return projects;
    const searchLower = searchText.trim().toLowerCase();
    return projects.filter((n) => n.title.toLowerCase().includes(searchLower));
  }, [notes, searchText]);

  // Group projects by status
  const planning = useMemo(() => filteredProjects.filter((n) => n.status === "planning").sort(sortByMtimeDesc), [filteredProjects]);
  const research = useMemo(() => filteredProjects.filter((n) => n.status === "research").sort(sortByMtimeDesc), [filteredProjects]);
  const upNext = useMemo(() => filteredProjects.filter((n) => n.status === "up-next" || n.status === "up next").sort(sortByMtimeDesc), [filteredProjects]);
  const inProgress = useMemo(() => filteredProjects.filter((n) => n.status === "in-progress" || n.status === "active").sort(sortByMtimeDesc), [filteredProjects]);
  const onHold = useMemo(() => filteredProjects.filter((n) => n.status === "on-hold" || n.status === "hold" || n.status === "paused").sort(sortByMtimeDesc), [filteredProjects]);
  const someday = useMemo(() => filteredProjects.filter((n) => n.status === "someday").sort(sortByMtimeDesc), [filteredProjects]);
  const other = useMemo(() => filteredProjects.filter((n) => !n.status || (n.status !== "planning" && n.status !== "research" && n.status !== "up-next" && n.status !== "up next" && n.status !== "in-progress" && n.status !== "active" && n.status !== "on-hold" && n.status !== "hold" && n.status !== "paused" && n.status !== "someday")).sort(sortByMtimeDesc), [filteredProjects]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects by title…"
      onSearchTextChange={setSearchText}
      searchText={searchText}
    >
      {planning.length > 0 && (
        <List.Section title={`Planning (${planning.length})`} subtitle="status: planning">
          {planning.map((n) => (
            <ProjectItem key={n.path} note={n} onRefresh={load} />
          ))}
        </List.Section>
      )}
      {research.length > 0 && (
        <List.Section title={`Research (${research.length})`} subtitle="status: research">
          {research.map((n) => (
            <ProjectItem key={n.path} note={n} onRefresh={load} />
          ))}
        </List.Section>
      )}
      {upNext.length > 0 && (
        <List.Section title={`Up Next (${upNext.length})`} subtitle="status: up-next">
          {upNext.map((n) => (
            <ProjectItem key={n.path} note={n} onRefresh={load} />
          ))}
        </List.Section>
      )}
      {inProgress.length > 0 && (
        <List.Section title={`In Progress (${inProgress.length})`} subtitle="status: in-progress">
          {inProgress.map((n) => (
            <ProjectItem key={n.path} note={n} onRefresh={load} />
          ))}
        </List.Section>
      )}
      {onHold.length > 0 && (
        <List.Section title={`On Hold (${onHold.length})`} subtitle="status: on-hold">
          {onHold.map((n) => (
            <ProjectItem key={n.path} note={n} onRefresh={load} />
          ))}
        </List.Section>
      )}
      {someday.length > 0 && (
        <List.Section title={`Someday (${someday.length})`} subtitle="status: someday">
          {someday.map((n) => (
            <ProjectItem key={n.path} note={n} onRefresh={load} />
          ))}
        </List.Section>
      )}
      {other.length > 0 && (
        <List.Section title={`Other (${other.length})`}>
          {other.map((n) => (
            <ProjectItem key={n.path} note={n} onRefresh={load} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SetStatusForm({ note, onStatusUpdated }: { note: Note; onStatusUpdated: () => void }) {
  const { pop } = useNavigation();
  const statuses = [
    { value: "planning", title: "Planning", icon: Icon.Pencil },
    { value: "research", title: "Research", icon: Icon.MagnifyingGlass },
    { value: "up-next", title: "Up Next", icon: Icon.ArrowRight },
    { value: "in-progress", title: "In Progress", icon: Icon.CircleProgress },
    { value: "on-hold", title: "On Hold", icon: Icon.Pause },
    { value: "someday", title: "Someday", icon: Icon.Calendar },
    { value: "done", title: "Done", icon: Icon.CheckCircle },
    { value: "canceled", title: "Canceled", icon: Icon.XMarkCircle }
  ];

  async function handleStatusChange(newStatus: string) {
    try {
      await updateNoteStatus(note.path, newStatus);
      await showToast({
        style: Toast.Style.Success,
        title: `Set Status: ${newStatus}`,
        message: note.title
      });
      onStatusUpdated();
      pop();
    } catch (error: any) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to update", message: error.message });
    }
  }

  return (
    <List navigationTitle={`Set Status: ${note.title}`} searchBarPlaceholder="Choose new status...">
      <List.Section title={`Current: ${note.status || "none"}`}>
        {statuses.map((s) => (
          <List.Item
            key={s.value}
            title={s.title}
            icon={s.icon}
            accessories={s.value === note.status ? [{ text: "Current" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title={`Set to ${s.title}`}
                  icon={Icon.Checkmark}
                  onAction={() => handleStatusChange(s.value)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ProjectItem({ note, onRefresh }: { note: Note; onRefresh: () => void }) {
  const accessories = [];
  if (note.dateDue) {
    const overdue = isOverdue(note.dateDue);
    const today = isToday(note.dateDue);
    let iconColor: Color | undefined = undefined;
    if (overdue) {
      iconColor = Color.Red;
    } else if (today) {
      iconColor = Color.Green;
    }
    accessories.push({
      text: formatDate(note.dateDue),
      icon: { source: Icon.Calendar, tintColor: iconColor }
    });
  }
  if (note.status) {
    accessories.push({ text: note.status });
  }

  // Determine icon based on status
  let itemIcon = Icon.Folder;
  if (note.status === "planning") {
    itemIcon = Icon.Pencil;
  } else if (note.status === "research") {
    itemIcon = Icon.MagnifyingGlass;
  } else if (note.status === "up-next" || note.status === "up next") {
    itemIcon = Icon.ArrowRight;
  } else if (note.status === "in-progress" || note.status === "active") {
    itemIcon = Icon.CircleProgress;
  } else if (note.status === "on-hold" || note.status === "hold" || note.status === "paused") {
    itemIcon = Icon.Pause;
  } else if (note.status === "someday") {
    itemIcon = Icon.Calendar;
  }

  async function handleDateChange(field: string, fieldLabel: string, date: Date | null) {
    try {
      await updateNoteDate(note.path, field, date);
      const message = date ? `Set to: ${date.toLocaleDateString()}` : "Cleared";
      await showToast({
        style: Toast.Style.Success,
        title: `${fieldLabel} Updated`,
        message: note.title
      });
      onRefresh();
    } catch (error: any) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to update", message: error.message });
    }
  }

  return (
    <List.Item
      title={note.title}
      icon={itemIcon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Set Status"
            icon={Icon.Pencil}
            target={<SetStatusForm note={note} onStatusUpdated={onRefresh} />}
          />
          <Action.PickDate
            title="Set Due Date"
            icon={Icon.Calendar}
            onChange={(date) => handleDateChange("date_due", "Due Date", date)}
          />
          <Action.PickDate
            title="Set Start Date"
            icon={Icon.PlayFilled}
            onChange={(date) => handleDateChange("date_started", "Start Date", date)}
          />
          <Action.OpenInBrowser
            title="Open in Obsidian"
            url={`obsidian://open?path=${encodeURIComponent(note.path)}`}
            icon={Icon.Document}
          />
          <Action.ShowInFinder path={note.path} />
          <Action.CopyToClipboard title="Copy Path" content={note.path} />
          <Action title="Refresh" icon={Icon.RotateClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}
