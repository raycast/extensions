import { showToast, Toast } from "@raycast/api";
import { Project } from "./project";
import { Task } from "./task";
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
        "Please install TickTick or upgrade to the latest version."
      );
      return false;
    }

    return true;
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Application not found",
      "Please install TickTick or upgrade to the latest version."
    );
    return false;
  }
};

const errorHandler = (err: unknown) => {
  console.log("parse error", err);
  showToast(Toast.Style.Failure, "Something went wrong");
};

const getDateListData = async (command: string) => {
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
        name: getSectionNameByDate(new Date(convertMacTime2JSTime(section.date))),
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
