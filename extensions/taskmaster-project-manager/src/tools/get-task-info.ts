/**
 * Get detailed information about a specific TaskMaster task by ID.
 * Returns comprehensive task details including title, description, status,
 * priority, complexity score, dependencies, subtasks, and implementation
 * details formatted as markdown for optimal AI assistant presentation.
 */

import { getPreferenceValues } from "@raycast/api";
import { TaskMasterSettings } from "../types/task";
import { readTasks } from "../lib/utils";

export default async function (input: {
  /**
   * The TaskMaster task ID to get information about.
   *
   * Format: Task IDs follow TaskMaster's hierarchical structure:
   * - Main tasks: "1", "2", "3", etc.
   * - Subtasks: "1.1", "1.2", "2.1", etc.
   * - Sub-subtasks: "1.1.1", "1.1.2", etc.
   *
   * How to find available task IDs:
   * - Use analyze-project tool to see all tasks and their IDs
   * - Task IDs are displayed in project analysis output
   * - Check TaskMaster project files in .taskmaster/tasks/tasks.json
   *
   * Examples:
   * - "1" → Main task #1
   * - "2.3" → Subtask #3 of main task #2
   * - "1.2.1" → Sub-subtask #1 of subtask #2 of main task #1
   */
  taskId: string;
}) {
  try {
    // Validate input format
    if (!input.taskId) {
      return '**Error: Task ID is required.**\n\nPlease provide a valid TaskMaster task ID.\n\n**Examples:**\n- `"1"` for main task #1\n- `"2.3"` for subtask #3 of task #2\n- `"1.2.1"` for sub-subtask #1 of subtask #2 of task #1';
    }

    if (typeof input.taskId !== "string") {
      return '**Error: Task ID must be a string.**\n\n**Correct format:** `"1"`, `"2.3"`, `"1.1.1"`\n**Incorrect format:** `1` (number), `["1"]` (array)';
    }

    // Validate TaskMaster ID pattern
    const validIdPattern = /^[1-9]\d*(\.[1-9]\d*)*$/;
    if (!validIdPattern.test(input.taskId)) {
      return `**Error: Invalid TaskMaster ID format: "${input.taskId}"**\n\n**Valid formats:**\n- Main tasks: "1", "2", "3", etc.\n- Subtasks: "1.1", "2.3", "10.5", etc.\n- Sub-subtasks: "1.2.1", "2.1.3", etc.\n\n**Rules:**\n- Numbers only, separated by dots\n- No leading zeros (use "1", not "01")\n- No trailing dots (use "1.2", not "1.2.")\n- Must start with a number ≥ 1`;
    }

    const settings = getPreferenceValues<TaskMasterSettings>();
    const { tasks } = await readTasks(settings.projectRoot);

    const task = tasks.find((t) => t.id === input.taskId);
    if (!task) {
      const availableIds = tasks.map((t) => t.id).sort();
      return `Task '${input.taskId}' not found in the project.\n\n**Available Task IDs:**\n${availableIds.map((id) => `- ${id}`).join("\n")}\n\n**Tips:**\n- Use the analyze-project tool to see all tasks with details\n- Task IDs are case-sensitive and must match exactly\n- Format: main tasks (1, 2, 3) or subtasks (1.1, 1.2, 2.1)`;
    }

    // Format task information
    let info = `# Task ${task.id}: ${task.title}\n\n`;
    info += `**Status**: ${task.status}\n`;
    info += `**Priority**: ${task.priority}\n`;

    if (task.complexityScore) {
      info += `**Complexity**: ${task.complexityScore}/10\n`;
    }

    info += `\n## Description\n${task.description}\n`;

    if (task.details) {
      info += `\n## Details\n${task.details}\n`;
    }

    if (task.dependencies && task.dependencies.length > 0) {
      info += `\n## Dependencies\n`;
      task.dependencies.forEach((dep) => {
        info += `- ${dep}\n`;
      });
    }

    if (task.subtasks && task.subtasks.length > 0) {
      info += `\n## Subtasks (${task.subtasks.length})\n`;
      task.subtasks.forEach((subtask) => {
        info += `- ${subtask.id}: ${subtask.title} (${subtask.status})\n`;
      });
    }

    return info;
  } catch (error) {
    return `Error reading task information: ${String(error)}`;
  }
}
