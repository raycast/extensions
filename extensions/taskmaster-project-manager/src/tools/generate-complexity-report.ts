/**
 * Generate a comprehensive complexity analysis report for all TaskMaster tasks.
 * Analyzes task complexity scores, identifies high-complexity tasks that need breakdown,
 * provides recommendations for task subdivision, and creates actionable insights
 * for project planning and task management optimization.
 */

import fs from "fs";
import path from "path";
import { getPreferenceValues } from "@raycast/api";
import { TaskMasterSettings } from "../types/task";
import { readTasks } from "../lib/utils";

export default async function () {
  try {
    const settings = getPreferenceValues<TaskMasterSettings>();
    const { tasks } = await readTasks(settings.projectRoot);

    if (tasks.length === 0) {
      return "No tasks found in the project.";
    }

    // Filter tasks that don't have complexity scores or have high complexity (>5)
    const complexTasks = tasks.filter(
      (task) => !task.complexityScore || task.complexityScore > 5,
    );

    if (complexTasks.length === 0) {
      return "All tasks have appropriate complexity scores (≤5). No complex tasks requiring analysis found.";
    }

    const generatedAt = new Date().toISOString();
    const analysisData: Array<{
      task_id: string;
      complexity_score: number;
      recommended_subtasks: number;
      reasoning: string;
      breakdown_suggestion: string[];
    }> = [];

    // Generate analysis data
    complexTasks.slice(0, 5).forEach((task) => {
      // Estimate complexity based on task characteristics
      let estimatedComplexity = 6; // Default for tasks without scores

      if (task.complexityScore) {
        estimatedComplexity = task.complexityScore;
      } else {
        // Estimate based on task characteristics
        if (task.description && task.description.length > 500)
          estimatedComplexity += 1;
        if (task.details && task.details.length > 1000)
          estimatedComplexity += 1;
        if (task.dependencies && task.dependencies.length > 3)
          estimatedComplexity += 1;
        if (task.subtasks && task.subtasks.length > 8) estimatedComplexity += 1;
        if (task.title.toLowerCase().includes("refactor"))
          estimatedComplexity += 1;
        if (task.title.toLowerCase().includes("comprehensive"))
          estimatedComplexity += 1;
        estimatedComplexity = Math.min(estimatedComplexity, 10);
      }

      // Calculate recommended subtasks
      const recommendedSubtasks = Math.max(
        3,
        Math.min(Math.ceil(estimatedComplexity * 0.8), 8),
      );

      // Generate expansion prompt
      let expansionPrompt = `This ${estimatedComplexity >= 8 ? "highly complex" : "complex"} task`;
      if (task.description) {
        const descriptionWords = task.description
          .split(" ")
          .slice(0, 20)
          .join(" ");
        expansionPrompt += ` involves ${descriptionWords}...`;
      }

      expansionPrompt += ` Break this down into ${recommendedSubtasks} manageable subtasks:`;

      if (estimatedComplexity >= 8) {
        expansionPrompt += ` (1) planning and architecture design, (2) core implementation, (3) testing and validation,`;
        if (recommendedSubtasks > 3) {
          expansionPrompt += ` (4) integration and refinement,`;
        }
        if (recommendedSubtasks > 4) {
          expansionPrompt += ` and (${recommendedSubtasks}) documentation and cleanup.`;
        } else {
          expansionPrompt += ` and (${recommendedSubtasks}) documentation.`;
        }
      } else {
        expansionPrompt += ` focusing on logical separation of concerns and maintaining clear dependencies between phases.`;
      }

      // Generate reasoning
      let reasoning = `This task has complexity score ${estimatedComplexity}/10 due to several factors: `;
      const reasons = [];

      if (task.description && task.description.length > 500) {
        reasons.push("detailed requirements spanning multiple areas");
      }
      if (task.details && task.details.length > 1000) {
        reasons.push("extensive implementation details");
      }
      if (task.dependencies && task.dependencies.length > 2) {
        reasons.push(`${task.dependencies.length} task dependencies`);
      }
      if (task.subtasks && task.subtasks.length > 5) {
        reasons.push(
          `${task.subtasks.length} existing subtasks indicating scope`,
        );
      }
      if (task.title.toLowerCase().includes("refactor")) {
        reasons.push("refactoring requires careful coordination");
      }
      if (task.title.toLowerCase().includes("comprehensive")) {
        reasons.push("comprehensive scope across multiple components");
      }

      if (reasons.length === 0) {
        reasons.push("broad scope and potential architectural implications");
      }

      reasoning += reasons.join(", ") + ".";

      if (estimatedComplexity >= 8) {
        reasoning +=
          " This high complexity warrants breaking into smaller, focused tasks to reduce risk and improve tracking.";
      }

      // Add to analysis data
      analysisData.push({
        task_id: task.id,
        complexity_score: estimatedComplexity,
        recommended_subtasks: recommendedSubtasks,
        reasoning,
        breakdown_suggestion: [expansionPrompt],
      });
    });

    // Create JSON report in TaskMaster format
    const jsonReport = {
      meta: {
        generatedAt,
        tasksAnalyzed: analysisData.length,
        totalTasks: tasks.length,
        analysisCount: analysisData.length,
        thresholdScore: 5,
        projectName: "TaskMaster",
        usedResearch: false,
      },
      complexityAnalysis: analysisData,
    };

    // Ensure reports directory exists and write JSON file
    try {
      const reportsDir = path.join(
        settings.projectRoot,
        ".taskmaster",
        "reports",
      );
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const reportPath = path.join(reportsDir, "task-complexity-report.json");
      fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
    } catch (writeError) {
      // Continue even if file writing fails
      console.error("Failed to write JSON report:", writeError);
    }

    // Generate markdown report
    let report = `# TaskMaster Complexity Analysis Report\n\n`;

    report += `## Analysis Overview\n`;
    report += `- **Tasks Analyzed**: ${analysisData.length}\n`;
    report += `- **Total Tasks**: ${tasks.length}\n`;
    report += `- **Complexity Threshold**: >5\n`;
    report += `- **Generated**: ${generatedAt}\n`;
    report += `- **Report Saved**: .taskmaster/reports/task-complexity-report.json\n\n`;

    report += `## Complex Tasks Analysis\n\n`;

    analysisData.forEach((analysis, index) => {
      const originalTask = tasks.find((t) => t.id === analysis.task_id);
      report += `### ${index + 1}. Task ${analysis.task_id}: ${originalTask?.title || "Unknown Task"}\n\n`;
      report += `**Complexity Score**: ${analysis.complexity_score}/10\n`;
      report += `**Recommended Subtasks**: ${analysis.recommended_subtasks}\n`;

      // Find current subtasks count
      report += `**Current Subtasks**: ${originalTask?.subtasks ? originalTask.subtasks.length : 0}\n\n`;

      report += `**Expansion Recommendation**:\n${analysis.breakdown_suggestion[0] || "No specific breakdown provided"}\n\n`;
      report += `**Reasoning**: ${analysis.reasoning}\n\n`;
      report += `---\n\n`;
    });

    if (complexTasks.length > 5) {
      report += `*Showing top 5 complex tasks. ${complexTasks.length - 5} additional complex tasks found.*\n\n`;
    }

    // Recommendations
    report += `## Recommendations\n\n`;

    const tasksWithoutScores = tasks.filter((t) => !t.complexityScore).length;
    if (tasksWithoutScores > 0) {
      report += `- 📊 **${tasksWithoutScores} tasks lack complexity scores** - consider assigning scores 1-10\n`;
    }

    const highComplexityTasksArray = tasks.filter(
      (t) => (t.complexityScore || 6) >= 8,
    );
    const highComplexityTasks = highComplexityTasksArray.length;
    if (highComplexityTasks > 0) {
      report += `- ⚠️  **${highComplexityTasks} tasks have very high complexity (≥8)** - consider breaking down\n`;
    }

    const mediumComplexityTasksArray = tasks.filter((t) => {
      const score = t.complexityScore || 6;
      return score >= 5 && score < 8;
    });
    const mediumComplexityTasks = mediumComplexityTasksArray.length;

    const tasksWithManySubtasks = tasks.filter(
      (t) => t.subtasks && t.subtasks.length > 10,
    ).length;
    if (tasksWithManySubtasks > 0) {
      report += `- 🔄 **${tasksWithManySubtasks} tasks have many subtasks (>10)** - may indicate over-decomposition\n`;
    }

    report += `- 🎯 **Focus on highest complexity tasks** first to reduce project risk\n`;
    report += `- 📋 **Use recommended subtask counts** as guidance for task breakdown\n`;
    report += `- 💾 **JSON report saved** to .taskmaster/reports/task-complexity-report.json for TaskMaster CLI compatibility\n\n`;

    // Add workflow guidance
    report += `## Tool Workflow\n\n`;
    report += `**Next Steps:**\n`;
    if (highComplexityTasksArray.length > 0) {
      const highIds = highComplexityTasksArray
        .map((t) => `\`${t.id}\``)
        .join(", ");
      report += `- 🔍 **Investigate high-complexity tasks**: Use **get-task-info** with IDs ${highIds}\n`;
      report += `- 📋 **Break down complex tasks**: Consider task subdivision using TaskMaster CLI\n`;
    }
    if (mediumComplexityTasks > 0) {
      report += `- ⚖️ **Review medium-complexity tasks**: May benefit from 2-3 subtasks each\n`;
    }
    report += `- 🎯 **Start with ready tasks**: Use **get-next-task** to find optimal starting point\n`;
    report += `- 📊 **Monitor progress**: Use **analyze-project** for updated project status\n\n`;

    report += `**Cross-Reference:**\n- All task IDs in this report work with **get-task-info** tool\n- Use **analyze-project** to see current status and dependencies\n- Use **get-next-task** for intelligent task recommendations`;

    return report;
  } catch (error) {
    return `Error generating complexity report: ${String(error)}`;
  }
}
