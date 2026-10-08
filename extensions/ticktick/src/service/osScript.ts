import { showToast, Toast } from "@raycast/api";
import { Project } from "./project";
import { Section, Task } from "./task";
import { runAppleScript } from "run-applescript";
import { convertMacTime2JSTime, getSectionNameByDate } from "../utils/date";

const taskObject2Task = (object: Record<string, unknown>): Task => {
  return {
    id: object.id as Task["id"],
    title: object.title as Task["title"],
    content: object.content as Task["content"],
    desc: object.desc as Task["desc"],
    priority: object.priority as Task["priority"],
    projectId: object.projectId as Task["projectId"],
    items: object.items as Task["items"],
    kind: object.kind as Task["kind"],
    tags: (object.tags || []) as Task["tags"],
    startDate: object.startDate as Task["startDate"],
    dueDate: object.dueDate as Task["dueDate"],
    isAllDay: object.isAllDay as Task["isAllDay"],
    isFloating: object.isFloating as Task["isFloating"],
    timeZone: object.timeZone as Task["timeZone"],
  };
};

const projectObject2Project = (object: Record<string, unknown>): Project => {
  return {
    id: object.id as string,
    name: object.name as string,
  };
};

const checkAppInstalled = async () => {
  try {
    const result = await runAppleScript(`
    exists application "TickTick"
    `);

    if (result === "false") {
      showToast(
        Toast.Style.Failure,
        "Application not found",
        "Please ensure that you have installed the TickTick macOS app or upgrade to the the latest version."
      );
      return false;
    }

    return true;
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Application not found",
      "Please ensure that you have installed the TickTick macOS app or upgrade to the the latest version."
    );
    return false;
  }
};

const errorHandler = (err: unknown) => {
  console.log("parse error", err);
  showToast(
    Toast.Style.Failure,
    "Something went wrong",
    "Please ensure that you have installed the TickTick macOS app or upgrade to the the latest version."
  );
};

const getDateListData = async (command: string): Promise<Section[]> => {
  const installed = await checkAppInstalled();
  if (!installed) return [];
  try {
    const result = (await runAppleScript(command)) as string;
    if (result === "missing value") {
      return [];
    }
    const parsedResult = JSON.parse(result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return parsedResult.map((section: any) => {
      if (section.id === "note") {
        return {
          id: "note",
          name: "Note",
          children: section.tasks.map(taskObject2Task),
        };
      }
      return {
        id: `date-${section.date}`,
        name: section.date === 0 ? "No Date" : getSectionNameByDate(new Date(convertMacTime2JSTime(section.date))),
        children: section.tasks.map(taskObject2Task),
      };
    });
  } catch (e) {
    errorHandler(e);
    return [];
  }
};

export const getToday = async () => {
  return await getDateListData(`
    set result to ""
    tell application "TickTick"
      set result to today tasks from "raycast"
    end tell
    return result
  `);
};

export const getNext7Days = async () => {
  return await getDateListData(`
    set result to ""
    tell application "TickTick"
      set result to next7days tasks from "raycast"
    end tell
    return result
  `);
};

export const getSearchByKeyword = async (keyword: string) => {
  const installed = await checkAppInstalled();
  if (!installed) return [];
  try {
    const result = (await runAppleScript(`
    set result to ""
    tell application "TickTick"
      set result to search tasks "${keyword}" from "raycast"
    end tell
    return result
  `)) as string;
    if (result === "missing value") {
      return [];
    }
    const parsedResult = JSON.parse(result);
    return parsedResult.map(taskObject2Task);
  } catch (e) {
    errorHandler(e);
    return [];
  }
};

export const getTasksByProjectId = async (id: string) => {
  return getDateListData(`
    set result to ""
    tell application "TickTick"
      tasks in "${id}" from "raycast"    
    end tell
    return result
  `);
};

export const getProjects = async () => {
  const installed = await checkAppInstalled();
  if (!installed) return [];
  try {
    const result = (await runAppleScript(`
    set result to ""
    tell application "TickTick"
      set result to projects from "raycast"
    end tell
    return result
  `)) as string;
    if (result === "missing value") {
      return [];
    }

    const parsedResult = JSON.parse(result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projects: Project[] = parsedResult.map((project: any) => {
      return projectObject2Project(project);
    });
    return projects;
  } catch (e) {
    errorHandler(e);
    return [];
  }
};

export const addTask = async (data: {
  projectId: string;
  title: string;
  description: string;
  dueDate?: string;
  isAllDay?: boolean;
  priority?: string;
}) => {
  const { projectId, title, description, dueDate, isAllDay, priority } = data;
  const installed = await checkAppInstalled();
  if (!installed) return undefined;

  try {
    const result = (await runAppleScript(`
    set result to ""
    tell application "TickTick"
      set result to add task to list "${projectId}" title "${title}" description "${description}"${
      dueDate ? ` due date "${dueDate}" is allday ${isAllDay}` : ""
    } ${priority ? ` priority "${priority}"` : ""} from "raycast"
    end tell
  `)) as string;
    if (result === "missing value") {
      return false;
    }
    if (result === "true") return true;
    return false;
  } catch (e) {
    errorHandler(e);
    return undefined;
  }
};

export const toggleTask = async (id: string) => {
  const installed = await checkAppInstalled();
  if (!installed) return false;

  try {
    const result = (await runAppleScript(`
    set result to ""
    tell application "TickTick"
      set result to toggle task "${id}" from "raycast"
    end tell
  `)) as string;
    if (result === "missing value") {
      return false;
    }
    if (result === "true") return true;
    return false;
  } catch (e) {
    errorHandler(e);
    return false;
  }
};
