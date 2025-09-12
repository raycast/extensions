/**
 * Analyze the current TaskMaster project and provide comprehensive insights including
 * task distribution by status and priority, complexity analysis, dependency tracking,
 * and project health metrics. Returns a detailed markdown-formatted report.
 */

import { getPreferenceValues } from "@raycast/api";
import { TaskMasterSettings, TaskStatus } from "../types/task";
import { readTasks } from "../lib/utils";

export default async function () {
  try {
    const settings = getPreferenceValues<TaskMasterSettings>();
    const { tasks } = await readTasks(settings.projectRoot);

    if (tasks.length === 0) {
      return "**No tasks found in the project.**\n\n**Getting Started:**\n- Create tasks using the Add Task command\n- Import tasks from a TaskMaster project\n- Check that the project root path in preferences points to a valid TaskMaster project\n\n**Expected File Structure:**\n```\nproject/\n  .taskmaster/\n    tasks/\n      tasks.json\n```";
    }

    // Analyze tasks
    const totalTasks = tasks.length;
    const statusCounts: Record<TaskStatus, number> = {
      pending: 0,
      "in-progress": 0,
      review: 0,
      done: 0,
      deferred: 0,
      cancelled: 0,
    };

    const priorityCounts = { high: 0, medium: 0, low: 0 };
    let totalComplexity = 0;
    let complexityCount = 0;
    let tasksWithDependencies = 0;
    let totalSubtasks = 0;
    let blockedTasks = 0;

    tasks.forEach((task) => {
      // Status analysis - ensure valid status
      if (task.status in statusCounts) {
        statusCounts[task.status]++;
      }

      // Priority analysis - ensure valid priority
      if (task.priority in priorityCounts) {
        priorityCounts[task.priority]++;
      }

      // Complexity analysis
      if (
        typeof task.complexityScore === "number" &&
        task.complexityScore > 0
      ) {
        totalComplexity += task.complexityScore;
        complexityCount++;
      }

      // Dependencies analysis
      if (Array.isArray(task.dependencies) && task.dependencies.length > 0) {
        tasksWithDependencies++;

        // Check if task is potentially blocked
        const hasPendingDeps = task.dependencies.some((depId) => {
          const depTask = tasks.find((t) => t.id === depId);
          return depTask && depTask.status !== "done";
        });

        if (hasPendingDeps && task.status === "pending") {
          blockedTasks++;
        }
      }

      // Subtasks analysis
      if (Array.isArray(task.subtasks)) {
        totalSubtasks += task.subtasks.length;
      }
    });

    // Calculate metrics
    const completionRate = Math.round((statusCounts.done / totalTasks) * 100);
    const averageComplexity =
      complexityCount > 0
        ? (totalComplexity / complexityCount).toFixed(1)
        : "N/A";
    const activeTasks =
      statusCounts.pending + statusCounts["in-progress"] + statusCounts.review;

    // Generate analysis report
    let analysis = `# TaskMaster Project Analysis\n\n`;

    analysis += `## Overview\n`;
    analysis += `- **Total Tasks**: ${totalTasks}\n`;
    analysis += `- **Completion Rate**: ${completionRate}% (${statusCounts.done} completed)\n`;
    analysis += `- **Active Tasks**: ${activeTasks}\n`;
    analysis += `- **Average Complexity**: ${averageComplexity}/10\n`;
    analysis += `- **Total Subtasks**: ${totalSubtasks}\n\n`;

    analysis += `## Status Breakdown\n`;
    analysis += `- ⏳ **Pending**: ${statusCounts.pending}\n`;
    analysis += `- 🔄 **In Progress**: ${statusCounts["in-progress"]}\n`;
    analysis += `- 👀 **Review**: ${statusCounts.review}\n`;
    analysis += `- ✅ **Done**: ${statusCounts.done}\n`;
    analysis += `- ⏸️ **Deferred**: ${statusCounts.deferred}\n`;
    analysis += `- ❌ **Cancelled**: ${statusCounts.cancelled}\n\n`;

    analysis += `## Priority Distribution\n`;
    analysis += `- 🔥 **High**: ${priorityCounts.high}\n`;
    analysis += `- 🟡 **Medium**: ${priorityCounts.medium}\n`;
    analysis += `- 🔵 **Low**: ${priorityCounts.low}\n\n`;

    if (tasksWithDependencies > 0) {
      analysis += `## Dependencies\n`;
      analysis += `- **Tasks with Dependencies**: ${tasksWithDependencies}\n`;
      analysis += `- **Potentially Blocked**: ${blockedTasks}\n\n`;
    }

    // Show some task details for context
    analysis += `## Task Examples\n`;
    const sampleTasks = tasks.slice(0, 3);
    sampleTasks.forEach((task) => {
      analysis += `- **${task.id}**: ${task.title} (${task.status}, ${task.priority} priority)\n`;
    });
    if (tasks.length > 3) {
      analysis += `- ... and ${tasks.length - 3} more tasks\n`;
    }
    analysis += `\n`;

    // Recommendations
    analysis += `## Recommendations\n`;

    if (blockedTasks > 0) {
      analysis += `- ⚠️ **${blockedTasks} tasks may be blocked** by incomplete dependencies\n`;
    }

    if (statusCounts["in-progress"] > 5) {
      analysis += `- 🎯 **Focus needed**: ${statusCounts["in-progress"]} tasks in progress - consider limiting WIP\n`;
    }

    if (statusCounts.review > 3) {
      analysis += `- 👀 **Review backlog**: ${statusCounts.review} tasks awaiting review\n`;
    }

    const readyTasks = tasks.filter(
      (task) =>
        task.status === "pending" &&
        (!Array.isArray(task.dependencies) ||
          task.dependencies.length === 0 ||
          task.dependencies.every((depId) => {
            const depTask = tasks.find((t) => t.id === depId);
            return depTask && depTask.status === "done";
          })),
    ).length;

    if (readyTasks > 0) {
      analysis += `- 🚀 **${readyTasks} tasks ready** to start (no blocking dependencies)\n`;
    }

    // Add workflow guidance section
    analysis += `\n## Next Actions\n`;

    if (readyTasks > 0) {
      analysis += `**🎯 Ready to Work:**\n- Use **get-next-task** tool to get specific task recommendation\n- Task IDs above can be used with **get-task-info** for details\n\n`;
    }

    if (blockedTasks > 0 || statusCounts["in-progress"] > 0) {
      analysis += `**🔍 Need Analysis:**\n- Use **generate-complexity-report** for task breakdown recommendations\n- Check specific tasks with **get-task-info [ID]** (e.g., get-task-info "1.2")\n\n`;
    }

    analysis += `**📋 Available Task IDs:**\n${tasks.map((t) => `\`${t.id}\``).join(", ")}\n\nUse these IDs with get-task-info for detailed task information.`;

    return analysis;
  } catch (error) {
    return `Error analyzing project: ${String(error)}`;
  }
}
