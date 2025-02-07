import { runAppleScript } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { showErrorHUD, TIMEOUT, validateInput } from "./utils";

export interface Project {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  name: string;
  project: Project;
  hasSubtasks?: boolean;
  subtasks?: Task[];
  parentTaskId?: string;
}

// Get all active projects
export async function getProjects(): Promise<Project[]> {
  try {
    const res = await runAppleScript(
      `
      const tyme = Application("Tyme");
      
      try {
        const allProjects = tyme.projects;
        const projectList = [];
        const completed = allProjects.completed();
        const ids = allProjects.id();
        const names = allProjects.name();
        
        for (let i = 0; i < ids.length; i++) {
          if (!completed[i]) { 
            projectList.push({
              id: ids[i],
              name: names[i]
            });
          }
        }
        
        JSON.stringify(projectList);
      } catch (err) {
        JSON.stringify({ error: err.message });
      }
      `,
      {
        language: "JavaScript",
        timeout: TIMEOUT,
      }
    );

    const result = JSON.parse(res);
    if ("error" in result) {
      throw new Error(result.error);
    }
    return result;
  } catch (error) {
    await showErrorHUD("fetching projects", error);
    return [];
  }
}

// Get tasks for a specific project
export async function getTasksForProject(projectId: string): Promise<Task[]> {
  try {
    if (!projectId) throw new Error("Project ID is required");

    const res = await runAppleScript(
      `
      const tyme = Application("Tyme");
      
      try {
        const project = tyme.projects.byId("${projectId}");
        if (!project) throw new Error("Project not found");
        
        const projectInfo = {
          id: project.id(),
          name: project.name()
        };

        const allTasks = project.tasks;
        const taskList = [];
        const taskCompleted = allTasks.completed();
        const taskIds = allTasks.id();
        const taskNames = allTasks.name();
        
        for (let i = 0; i < taskIds.length; i++) {
          if (!taskCompleted[i]) {
            const task = allTasks[i];            
            const allSubtasks = task.subtasks;
            const subtaskList = [];
            const subtaskCompleted = allSubtasks.completed();
            const subtaskIds = allSubtasks.id();
            const subtaskNames = allSubtasks.name();
            
            for (let j = 0; j < subtaskIds.length; j++) {
              if (!subtaskCompleted[j]) {
                subtaskList.push({
                  id: subtaskIds[j],
                  name: subtaskNames[j],
                  project: projectInfo,
                  parentTaskId: taskIds[i]
                });
              }
            }
            
            taskList.push({
              id: taskIds[i],
              name: taskNames[i],
              project: projectInfo,
              hasSubtasks: subtaskList.length > 0,
              subtasks: subtaskList
            });
          }
        }
        
        JSON.stringify(taskList);
      } catch (err) {
        JSON.stringify({ error: err.message });
      }
      `,
      {
        language: "JavaScript",
        timeout: TIMEOUT,
      }
    );

    const result = JSON.parse(res);
    if ("error" in result) {
      throw new Error(result.error);
    }
    return result;
  } catch (error) {
    await showErrorHUD("fetching tasks", error);
    return [];
  }
}

// Create a new project
export async function createProject(name: string): Promise<Project> {
  try {
    const validatedName = validateInput(name);
    if (!validatedName) throw new Error("Project name is required");

    const res = await runAppleScript(
      `
      const tyme = Application("Tyme");
      
      try {
        const newProject = tyme.make({
          new: "project",
          withProperties: {
            name: "${validatedName}",
            completed: false
          }
        });
        
        const projectInfo = {
          id: newProject.id(),
          name: newProject.name()
        };
        
        JSON.stringify(projectInfo);
      } catch (err) {
        JSON.stringify({ error: err.message });
      }
      `,
      {
        language: "JavaScript",
        timeout: TIMEOUT,
      }
    );

    const result = JSON.parse(res);
    if ("error" in result) {
      throw new Error(result.error);
    }
    return result;
  } catch (error) {
    await showErrorHUD("creating project", error);
    throw error;
  }
}

// Create a task in a specific project
export async function createTask(projectId: string, name: string): Promise<Task> {
  try {
    const validatedName = validateInput(name);
    if (!validatedName) throw new Error("Task name is required");
    if (!projectId) throw new Error("Project ID is required");

    const res = await runAppleScript(
      `
      tell application "Tyme"
        try
          set targetProject to first project whose id is "${projectId}"
          if targetProject is missing value then error "Project not found"
          
          make new task at targetProject with properties {name:"${validatedName}", taskType:"timed", completed:false}
          set newTask to result
          
          -- Build JSON string manually
          set json to "{"
          set json to json & "\\"id\\":\\"" & (id of newTask) & "\\","
          set json to json & "\\"name\\":\\"" & (name of newTask) & "\\","
          set json to json & "\\"project\\":{"
          set json to json & "\\"id\\":\\"" & (id of targetProject) & "\\","
          set json to json & "\\"name\\":\\"" & (name of targetProject) & "\\""
          set json to json & "}"
          set json to json & "}"
          
          return json
        on error errMsg
          return "{\\"error\\":\\"" & errMsg & "\\"}"
        end try
      end tell
      `,
      { timeout: TIMEOUT }
    );

    const result = JSON.parse(res);
    if ("error" in result) {
      throw new Error(result.error);
    }
    return result;
  } catch (error) {
    await showErrorHUD("creating task", error);
    throw error;
  }
}

export async function startTrackingTask(taskId: string): Promise<boolean> {
  try {
    if (!taskId) throw new Error("Task ID is required");

    const preferences = getPreferenceValues<Preferences.StartTaskTracking>();

    if (preferences.stopRunningTimers) {
      await stopTracking();
    }

    const res = await runAppleScript(
      `
      tell application "Tyme"
        try
          set success to StartTrackerForTaskID "${taskId}"
          return success
        on error errMsg
          return false
        end try
      end tell
      `,
      { timeout: TIMEOUT }
    );

    return JSON.parse(res);
  } catch (error) {
    await showErrorHUD("starting task tracking", error);
    return false;
  }
}

export async function stopTracking(): Promise<boolean> {
  try {
    const res = await runAppleScript(
      `
      tell application "Tyme"
        try
          set currentlyTracked to trackedTaskIDs
          set allStopped to true
          
          if length of currentlyTracked is greater than 0 then
            repeat with currentId in currentlyTracked
              try
                if not (StopTrackerForTaskID currentId) then
                  set allStopped to false
                end if
              on error
                set allStopped to false
              end try
            end repeat
          end if
          
          return allStopped
        on error errMsg
          return false
        end try
      end tell
      `,
      { timeout: TIMEOUT }
    );

    return JSON.parse(res);
  } catch (error) {
    await showErrorHUD("stopping task tracking", error);
    return false;
  }
}

// Helper function to check if Tyme is running
export async function checkTymeAvailability(): Promise<boolean> {
  try {
    const res = await runAppleScript(
      `
      tell application "System Events"
        return exists application process "Tyme"
      end tell
      `,
      { timeout: TIMEOUT }
    );

    return JSON.parse(res);
  } catch {
    return false;
  }
}
