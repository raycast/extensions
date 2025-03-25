import { exec } from "child_process";
import { promisify } from "util";
import { Task, Status, Priority } from "./types/types";
import { getPreferenceValues } from "@raycast/api";

const execPromise = promisify(exec);
const taskPath = getPreferenceValues().taskPath;

const overrideError = "Configuration override rc.json.array:on\n";
const command = `${taskPath} export rc.json.array:on`;

//
// returns a list of all tasks sorted by urgency
export const getTasks = async () => {
  let tasks: Task[] = [];
  try {
    const { stdout, stderr } = await execPromise(command, { maxBuffer: 1_000_000 });

    if (stderr && stderr !== overrideError) {
      throw new Error("please make sure you have set the path to task in the extension settings");
    }

    const data = JSON.parse(stdout) as Task[];
    if (data) tasks = data.sort((a, b) => b.urgency - a.urgency);
  } catch (error) {
    throw new Error("Please make sure you have set the path to task in the settings");
  }
  return tasks;
};

//
// returns a single task by its uuid
export const getTask = async (uuid: string) => {
  const tasks = await getTasks();
  return tasks.find((task) => task.uuid === uuid);
};

// returns all pending tasks
export const getActiveTasks = async () => {
  const tasks = await getTasks();
  return tasks.filter((task) => task.status === Status.Pending);
};

// returns pending tasks for a project
export const getTasksForProject = async (project: string) => {
  const tasks = await getTasks();
  // Testing => must give me the active task in the next tag
  return tasks.filter((task) => task.project === project && task.status === Status.Pending);
};

// returns all pending tasks for a tag (defaults to next)
export const getTasksForTag = async (tag = "next") => {
  const tasks = await getTasks();
  return tasks.filter((task) => task.tags && Array.from(task.tags).includes(tag) && task.status === Status.Pending);
};

export const addTask = async (commandString: string) => {
  const command = `${taskPath} add ${commandString}`;

  // execute command
  try {
    const { stderr } = await execPromise(command);
    if (stderr) console.error(stderr);
  } catch (error) {
    throw new Error(`error in addTask function: "${error}"`);
  }
};

// delete task by its uuid
export const deleteTask = async (uuid: string) => {
  try {
    const { stderr } = await execPromise(`${taskPath} delete ${uuid} rc.confirmation:off`);
    if (stderr) console.error(stderr);
  } catch (error) {
    throw new Error(`error in deleteTask function: "${error}"`);
  }
};

// mark a task as done by its uuid
export const markTaskAsDone = async (uuid: string) => {
  try {
    const { stderr } = await execPromise(`${taskPath} ${uuid} done`);
    if (stderr) console.error(stderr);
  } catch (error) {
    throw new Error(`error in markTaskAsDone function: "${error}"`);
  }
};

export const updateTask = async (
  uuid: string | null,
  description?: string,
  project?: string,
  tags?: string[],
  due?: string,
  priority?: Priority | ""
) => {
  const commandParts = [`${taskPath}`];

  if (uuid) {
    commandParts.push("modify", uuid);
  } else {
    commandParts.push("add");
  }

  if (typeof description !== "undefined") {
    commandParts.push(`"${description}"`);
  }

  if (typeof project !== "undefined") {
    if (project !== "") {
      commandParts.push(`project:"${project}"`);
    } else {
      commandParts.push(`project:`);
    }
  }

  if (typeof tags !== "undefined") {
    commandParts.push(...tags);
  }

  if (typeof due !== "undefined") {
    commandParts.push(`due:${due}`);
  }

  if (typeof priority !== "undefined") {
    if (priority) {
      commandParts.push(`priority:${priority}`);
    } else {
      commandParts.push(`priority:`);
    }
  }

  const command = commandParts.join(" ");

  // execute command
  try {
    const { stderr } = await execPromise(command);
    if (stderr.includes("not a valid date")) {
      throw new Error(`Invalid due date format. Use the Y-M-D format or Taskwarrior format`);
    }
  } catch (error) {
    throw new Error(`Error in modifyTask function. ${error}`);
  }
};

// deletes all tasks in projects and thus deletes the project
export const deleteProject = async (project: string) => {
  const tasks = await getTasksForProject(project);
  if (tasks.length == 0) {
    console.log(`project ${project} doesn't exist`);
    return;
  }

  for (const task of tasks) {
    await deleteTask(task.uuid);
  }
};

// returns all projects with active tasks
export const getAllProjects = async () => {
  const tasks = await getActiveTasks();
  const projects = new Set<string>();
  tasks.forEach((task) => {
    if (task.project) projects.add(task.project);
  });
  projects.add("All");
  return projects;
};
