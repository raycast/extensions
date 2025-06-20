import { getPreferenceValues } from "@raycast/api";
import { createTask, getDefaultWorkspaceId, getProjects } from "../motion-api";

interface Preferences {
  defaultWorkspaceId?: string;
  defaultProjectId?: string;
  defaultPriority?: "ASAP" | "HIGH" | "MEDIUM" | "LOW";
  defaultDuration?: string;
}

export default async function createMotionTask(
  taskName: string,
  taskDescription?: string,
  priority?: "ASAP" | "HIGH" | "MEDIUM" | "LOW",
  durationMinutes?: number,
  dueDate?: string,
  projectName?: string,
): Promise<string> {
  try {
    console.log("🤖 AI Tool: Creating Motion task", {
      taskName,
      taskDescription,
      priority,
      durationMinutes,
      dueDate,
      projectName,
    });

    // Get user preferences
    const preferences = getPreferenceValues<Preferences>();

    // Prepare task data
    const taskData: {
      name: string;
      description?: string;
      duration?: string | number;
      dueDate?: string;
      deadlineType?: "HARD" | "SOFT" | "NONE";
      priority?: "ASAP" | "HIGH" | "MEDIUM" | "LOW";
      assigneeId?: string;
      projectId?: string;
      workspaceId?: string;
      labels?: string[];
    } = {
      name: taskName.trim(),
    };

    // Add description if provided
    if (taskDescription && taskDescription.trim()) {
      taskData.description = taskDescription.trim();
    }

    // Set priority (use provided, then preference default, then MEDIUM)
    taskData.priority = priority || preferences.defaultPriority || "MEDIUM";

    // Set duration if provided or use preference default
    if (durationMinutes !== undefined && durationMinutes > 0) {
      taskData.duration = durationMinutes;
    } else if (preferences.defaultDuration) {
      const defaultDuration = preferences.defaultDuration;
      if (defaultDuration === "NONE" || defaultDuration === "REMINDER") {
        taskData.duration = defaultDuration;
      } else {
        const durationNum = parseInt(defaultDuration);
        if (!isNaN(durationNum) && durationNum > 0) {
          taskData.duration = durationNum;
        }
      }
    }

    // Set due date if provided
    if (dueDate) {
      // Try to parse the date string
      const parsedDate = new Date(dueDate);
      if (!isNaN(parsedDate.getTime())) {
        taskData.dueDate = parsedDate.toISOString();
      }
    }

    // Set workspace ID
    if (preferences.defaultWorkspaceId) {
      taskData.workspaceId = preferences.defaultWorkspaceId;
    } else {
      // Get the default workspace if none specified
      taskData.workspaceId = await getDefaultWorkspaceId();
    }

    // Handle project assignment if project name is provided
    if (projectName) {
      try {
        const projects = await getProjects(taskData.workspaceId);
        const matchingProject = projects.find(
          (project) =>
            project.name.toLowerCase().includes(projectName.toLowerCase()) ||
            projectName.toLowerCase().includes(project.name.toLowerCase()),
        );

        if (matchingProject) {
          taskData.projectId = matchingProject.id;
          console.log(`📁 Found matching project: ${matchingProject.name} (${matchingProject.id})`);
        } else {
          console.log(`⚠️ No matching project found for: ${projectName}`);
        }
      } catch (error) {
        console.log(`⚠️ Failed to search for project: ${error}`);
      }
    } else if (preferences.defaultProjectId) {
      taskData.projectId = preferences.defaultProjectId;
    }

    // Create the task
    const createdTask = await createTask(taskData);

    console.log("✅ Task created successfully:", createdTask.id);

    // Return a success message with task details
    let result = `✅ Successfully created task: "${createdTask.name}"`;

    if (createdTask.project) {
      result += `\n📁 Project: ${createdTask.project.Name}`;
    }

    if (createdTask.priority) {
      const priorityEmoji =
        {
          ASAP: "🔴",
          HIGH: "🟠",
          MEDIUM: "🟡",
          LOW: "🔵",
        }[createdTask.priority] || "⚪";
      result += `\n${priorityEmoji} Priority: ${createdTask.priority}`;
    }

    if (createdTask.duration && createdTask.duration !== "NONE") {
      result += `\n⏱️ Duration: ${createdTask.duration} minutes`;
    }

    if (createdTask.workspace) {
      result += `\n🏢 Workspace: ${createdTask.workspace.name}`;
    }

    return result;
  } catch (error) {
    console.error("❌ Failed to create Motion task:", error);

    let errorMessage = "Failed to create Motion task";
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;

      // Provide helpful troubleshooting tips
      if (error.message.includes("workspaceId")) {
        errorMessage += "\n\n💡 Tip: Make sure your Motion API key has access to at least one workspace.";
      } else if (error.message.includes("401") || error.message.includes("403")) {
        errorMessage += "\n\n💡 Tip: Check your Motion API key in Raycast preferences.";
      } else if (error.message.includes("400")) {
        errorMessage += "\n\n💡 Tip: Check that the task name is valid and all parameters are correct.";
      }
    }

    throw new Error(errorMessage);
  }
}
