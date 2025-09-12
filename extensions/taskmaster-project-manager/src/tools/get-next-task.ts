/**
 * Get the next recommended task to work on based on TaskMaster's intelligent
 * task prioritization algorithm. Considers task dependencies, priority levels,
 * complexity scores, and current project status to recommend the optimal
 * next task for maximum productivity and project progression.
 */

import { getPreferenceValues } from "@raycast/api";
import { TaskMasterSettings } from "../types/task";
import { readTasks } from "../lib/utils";

export default async function () {
  try {
    const settings = getPreferenceValues<TaskMasterSettings>();
    const { tasks } = await readTasks(settings.projectRoot);

    if (tasks.length === 0) {
      return "**No tasks found in the project.**\n\n**Next Steps:**\n- Use the Add Task command to create your first task\n- Import existing TaskMaster project data\n- Verify project root path in Raycast preferences\n\n**TaskMaster Integration:**\nThis tool works best with TaskMaster projects containing tasks with priorities and dependencies.";
    }

    // Filter tasks that are ready to work on
    const readyTasks = tasks.filter((task) => {
      // Must be pending
      if (task.status !== "pending") return false;

      // Check if all dependencies are completed
      if (task.dependencies && task.dependencies.length > 0) {
        const allDepsCompleted = task.dependencies.every((depId) => {
          const depTask = tasks.find((t) => t.id === depId);
          return depTask && depTask.status === "done";
        });

        if (!allDepsCompleted) return false;
      }

      return true;
    });

    if (readyTasks.length === 0) {
      const pendingTasks = tasks.filter((t) => t.status === "pending");
      if (pendingTasks.length > 0) {
        return `**No tasks ready to start.**\n\n**Blocked Tasks:** ${pendingTasks.length} pending tasks are waiting for dependencies:\n${pendingTasks.map((t) => `- Task ${t.id}: ${t.title}`).join("\n")}\n\n**Recommendations:**\n- Use analyze-project to see dependency chains\n- Complete prerequisite tasks first\n- Check for circular dependencies`;
      }
      const inProgressCount = tasks.filter(
        (t) => t.status === "in-progress",
      ).length;
      const doneCount = tasks.filter((t) => t.status === "done").length;
      return `**All tasks handled!** 🎉\n\n**Project Status:**\n- ✅ Completed: ${doneCount} tasks\n- 🔄 In Progress: ${inProgressCount} tasks\n- 📋 Pending: 0 tasks\n\n**Next Steps:**\n- Review in-progress tasks\n- Add new tasks if needed\n- Consider project completion`;
    }

    // Score and rank ready tasks
    const scoredTasks = readyTasks.map((task) => {
      let score = 0;

      // Priority scoring (high = 3, medium = 2, low = 1)
      const priorityScores = { high: 3, medium: 2, low: 1 };
      score += priorityScores[task.priority] * 10;

      // Complexity scoring (prefer lower complexity for quick wins)
      if (task.complexityScore) {
        // Invert complexity - lower complexity gets higher score
        score += (11 - task.complexityScore) * 2;
      }

      // Boost score if task has subtasks (indicates well-defined work)
      if (task.subtasks && task.subtasks.length > 0) {
        score += 5;
      }

      return { task, score };
    });

    // Sort by score (highest first)
    scoredTasks.sort((a, b) => b.score - a.score);

    const topTask = scoredTasks[0].task;

    // Format recommendation
    let recommendation = `# Next Recommended Task\n\n`;
    recommendation += `## ${topTask.id}: ${topTask.title}\n\n`;
    recommendation += `**Priority**: ${topTask.priority.toUpperCase()}\n`;

    if (topTask.complexityScore) {
      recommendation += `**Complexity**: ${topTask.complexityScore}/10\n`;
    }

    recommendation += `\n### Why this task?\n`;

    if (topTask.priority === "high") {
      recommendation += `- 🔥 High priority task\n`;
    }

    if (!topTask.dependencies || topTask.dependencies.length === 0) {
      recommendation += `- 🚀 No dependencies - can start immediately\n`;
    } else {
      recommendation += `- ✅ All dependencies completed\n`;
    }

    if (topTask.complexityScore && topTask.complexityScore <= 3) {
      recommendation += `- ⚡ Low complexity - quick win\n`;
    } else if (topTask.complexityScore && topTask.complexityScore <= 6) {
      recommendation += `- 🎯 Medium complexity - good progress opportunity\n`;
    }

    if (topTask.subtasks && topTask.subtasks.length > 0) {
      recommendation += `- 📋 Well-defined with ${topTask.subtasks.length} subtasks\n`;
    }

    recommendation += `\n### Description\n${topTask.description}\n`;

    if (topTask.details) {
      recommendation += `\n### Implementation Details\n${topTask.details}\n`;
    }

    if (topTask.subtasks && topTask.subtasks.length > 0) {
      recommendation += `\n### Subtasks\n`;
      topTask.subtasks.forEach((subtask) => {
        const icon = subtask.status === "done" ? "✅" : "⏳";
        recommendation += `${icon} ${subtask.id}: ${subtask.title}\n`;
      });
    }

    // Show alternatives
    if (scoredTasks.length > 1) {
      recommendation += `\n### Alternative Tasks\n`;
      scoredTasks.slice(1, 4).forEach((scored, index) => {
        const task = scored.task;
        recommendation += `${index + 2}. **${task.id}**: ${task.title} (${task.priority} priority)\n`;
      });
    }

    return recommendation;
  } catch (error) {
    return `Error finding next task: ${String(error)}`;
  }
}
