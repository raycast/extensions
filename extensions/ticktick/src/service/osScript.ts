import { showToast, ToastStyle } from "@raycast/api";
import { Project } from "./project";
import { Task } from "./task";
import { runAppleScript } from "run-applescript";
import { convertMacTime2JSTime, getSectionNameByDate } from "../utils/date";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const taskObject2Task = (object: Record<string, any>): Task => {
  return {
    id: object.id as string,
    title: object.title as string,
    priority: object.priority as Task["priority"],
    projectId: object.projectId as Task["projectId"],
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const projectObject2Project = (object: Record<string, any>): Project => {
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
        ToastStyle.Failure,
        "Application not found",
        "Please install TickTick or upgrade to the latest version."
      );
      return false;
    }

    return true;
  } catch (error) {
    showToast(ToastStyle.Failure, "Application not found", "Please install TickTick or upgrade to the latest version.");
    return false;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const errorHandler = (err: any) => {
  console.log("parse error", err);
  showToast(ToastStyle.Failure, "Something went wrong");
};

export const getToday = async () => {
  const installed = await checkAppInstalled();
  if (!installed) return [];
  try {
    const result = (await runAppleScript(`
    set result to ""
    tell application "TickTick"
	    set result to today tasks from "raycast"
    end tell
    return result
  `)) as string;
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

export const getNext7Days = async () => {
  const installed = await checkAppInstalled();
  if (!installed) return [];
  try {
    const result = (await runAppleScript(`
    set result to ""
    tell application "TickTick"
	    set result to next7days tasks from "raycast"
    end tell
    return result
  `)) as string;
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

export const getProjectId2Project = async () => {
  const installed = await checkAppInstalled();
  if (!installed) return {};
  try {
    const result = (await runAppleScript(`
    set result to ""
    tell application "TickTick"
      set result to projects from "raycast"
    end tell
    return result
  `)) as string;
    if (result === "missing value") {
      return {};
    }

    const parsedResult = JSON.parse(result);
    const projectId2Project: Record<string, Project> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsedResult.forEach((project: any) => {
      projectId2Project[project.id] = projectObject2Project(project);
    });
    return projectId2Project;
  } catch (e) {
    errorHandler(e);
    return {};
  }
};
