import { OmniFocusTask } from "../types/task";
import { GroupBy } from "../components/task-list";

export function groupTasks(tasks: OmniFocusTask[], groupBy: GroupBy): { title: string; tasks: OmniFocusTask[] }[] {
  // Ensure tasks is an array
  const taskArray = Array.isArray(tasks) ? tasks : [];

  if (!taskArray.length || groupBy === "none") {
    return [{ title: "All Tasks", tasks: taskArray }];
  }

  switch (groupBy) {
    case "project": {
      const groupedByProject = new Map<string, OmniFocusTask[]>();
      taskArray.forEach((task) => {
        const projectName = task.projectName || "No Project";
        if (!groupedByProject.has(projectName)) {
          groupedByProject.set(projectName, []);
        }
        const tasks = groupedByProject.get(projectName)!;
        tasks.push(task);
      });
      return Array.from(groupedByProject.entries())
        .sort(([a], [b]) => {
          if (a === "No Project") return 1;
          if (b === "No Project") return -1;
          return a.localeCompare(b);
        })
        .map(([projectName, tasks]) => ({
          title: projectName,
          tasks,
        }));
    }

    case "tags": {
      const noTags = "No Tags";
      const groupedByTags = new Map<string, OmniFocusTask[]>();

      taskArray.forEach((task) => {
        if (task.tags.length === 0) {
          if (!groupedByTags.has(noTags)) {
            groupedByTags.set(noTags, []);
          }
          const tasks = groupedByTags.get(noTags)!;
          tasks.push(task);
        } else {
          task.tags.forEach((tag) => {
            if (!groupedByTags.has(tag)) {
              groupedByTags.set(tag, []);
            }
            const tasks = groupedByTags.get(tag)!;
            tasks.push(task);
          });
        }
      });
      return Array.from(groupedByTags.entries())
        .sort(([a], [b]) => {
          if (a === noTags) return 1;
          if (b === noTags) return -1;
          return a.localeCompare(b);
        })
        .map(([title, tasks]) => ({
          title,
          tasks: tasks.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .filter((group) => group.tasks.length > 0);
    }

    case "priority": {
      const priorityOrder = ["Flagged", "Due", "None"];
      const groupedByPriority = new Map<string, OmniFocusTask[]>();

      // Initialize priority groups
      priorityOrder.forEach((p) => groupedByPriority.set(p, []));

      // Sort tasks into priority groups
      taskArray.forEach((task) => {
        let priority = "None";
        if (task.flagged) {
          priority = "Flagged";
        } else if (task.dueDate) {
          priority = "Due";
        }
        const tasks = groupedByPriority.get(priority)!;
        tasks.push(task);
      });

      // Return only non-empty priority groups in the specified order
      return priorityOrder
        .filter((priority) => groupedByPriority.get(priority)?.length)
        .map((priority) => ({
          title: priority,
          tasks: groupedByPriority.get(priority) || [],
        }));
    }

    default:
      return [{ title: "All Tasks", tasks: taskArray }];
  }
}
