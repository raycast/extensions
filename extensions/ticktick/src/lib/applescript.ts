import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { Task, Project } from "../types/ticktick";

export interface ASSection {
  id: string;
  name: string;
  children: Task[];
}

function mapTask(obj: Record<string, unknown>): Task {
  return {
    id: obj.id as string,
    title: (obj.title as string) ?? "",
    projectId: (obj.projectId as string) ?? "",
    content: obj.content as string | undefined,
    desc: obj.desc as string | undefined,
    priority: (obj.priority as 0 | 1 | 3 | 5) ?? 0,
    status: 0,
    items: (obj.items as Task["items"]) ?? [],
    kind: obj.kind as string | undefined,
    tags: (obj.tags as string[]) ?? [],
    startDate: obj.startDate as string | undefined,
    dueDate: obj.dueDate as string | undefined,
    isAllDay: obj.isAllDay as boolean | undefined,
    timeZone: obj.timeZone as string | undefined,
  };
}

function getSectionName(date: number): string {
  if (date === 0) return "No Date";
  // TickTick AppleScript returns Mac absolute time (seconds since 2001-01-01)
  const macEpochOffset = 978307200000;
  const jsDate = new Date(date * 1000 + macEpochOffset);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (jsDate.toDateString() === today.toDateString()) return "Today";
  if (jsDate.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return jsDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

async function checkAppInstalled(): Promise<boolean> {
  try {
    const result = await runAppleScript(`exists application "TickTick"`);
    if (result === "false") {
      showToast(Toast.Style.Failure, "TickTick not found", "Install the TickTick macOS app to use AppleScript mode.");
      return false;
    }
    return true;
  } catch {
    showToast(Toast.Style.Failure, "TickTick not found", "Install the TickTick macOS app to use AppleScript mode.");
    return false;
  }
}

function onError(err: unknown) {
  console.error("AppleScript error:", err);
  showToast(Toast.Style.Failure, "TickTick error", "Ensure TickTick is installed and running.");
}

async function fetchSections(script: string): Promise<ASSection[]> {
  if (!(await checkAppInstalled())) return [];
  try {
    const raw = (await runAppleScript(script)) as string;
    if (!raw || raw === "missing value") return [];
    const parsed = JSON.parse(raw);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed.map((section: any) => {
      if (section.id === "note") {
        return { id: "note", name: "Note", children: section.tasks.map(mapTask) };
      }
      return {
        id: `date-${section.date}`,
        name: getSectionName(section.date),
        children: section.tasks.map(mapTask),
      };
    });
  } catch (e) {
    onError(e);
    return [];
  }
}

export async function getToday(): Promise<ASSection[]> {
  return fetchSections(`
    set result to ""
    tell application "TickTick"
      set result to today tasks from "raycast"
    end tell
    return result
  `);
}

export async function getNext7Days(): Promise<ASSection[]> {
  return fetchSections(`
    set result to ""
    tell application "TickTick"
      set result to next7days tasks from "raycast"
    end tell
    return result
  `);
}

export async function getTasksByProjectId(id: string): Promise<ASSection[]> {
  return fetchSections(`
    set result to ""
    tell application "TickTick"
      tasks in "${id}" from "raycast"
    end tell
    return result
  `);
}

export async function searchTasks(keyword: string): Promise<Task[]> {
  if (!(await checkAppInstalled())) return [];
  try {
    const raw = (await runAppleScript(`
      set result to ""
      tell application "TickTick"
        set result to search tasks "${keyword.replace(/"/g, '\\"')}" from "raycast"
      end tell
      return result
    `)) as string;
    if (!raw || raw === "missing value") return [];
    const parsed = JSON.parse(raw);
    return parsed.map(mapTask);
  } catch (e) {
    onError(e);
    return [];
  }
}

export async function getProjects(): Promise<Project[]> {
  if (!(await checkAppInstalled())) return [];
  try {
    const raw = (await runAppleScript(`
      set result to ""
      tell application "TickTick"
        set result to projects from "raycast"
      end tell
      return result
    `)) as string;
    if (!raw || raw === "missing value") return [];
    const parsed = JSON.parse(raw);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsed.map((p: any) => ({ id: p.id as string, name: p.name as string }));
  } catch (e) {
    onError(e);
    return [];
  }
}

export async function addTaskAS(data: {
  projectId: string;
  title: string;
  description?: string;
  dueDate?: string;
  isAllDay?: boolean;
  priority?: string;
}): Promise<boolean> {
  const { projectId, title, description = "", dueDate, isAllDay, priority } = data;
  const safeTitle = title.replace(/"/g, '\\"');
  const safeDesc = description.replace(/"/g, '\\"');
  if (!(await checkAppInstalled())) return false;
  try {
    const raw = (await runAppleScript(`
      set result to ""
      tell application "TickTick"
        set result to add task to list "${projectId}" title "${safeTitle}" description "${safeDesc}"${
      dueDate ? ` due date "${dueDate}" is allday ${isAllDay}` : ""
    }${priority ? ` priority "${priority}"` : ""} from "raycast"
      end tell
    `)) as string;
    return raw === "true";
  } catch (e) {
    onError(e);
    return false;
  }
}

export async function toggleTaskAS(id: string): Promise<boolean> {
  if (!(await checkAppInstalled())) return false;
  try {
    const raw = (await runAppleScript(`
      set result to ""
      tell application "TickTick"
        set result to toggle task "${id}" from "raycast"
      end tell
    `)) as string;
    return raw === "true";
  } catch (e) {
    onError(e);
    return false;
  }
}
