import {
  LaunchProps,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { createTask, getProjects } from "./api";
import { Preferences } from "./types";

function parsePriority(input?: string): number {
  if (!input) return 0;
  const val = input.trim().toLowerCase();
  if (val === "high" || val === "h" || val === "5") return 5;
  if (val === "medium" || val === "med" || val === "m" || val === "3") return 3;
  if (val === "low" || val === "l" || val === "1") return 1;
  return 0;
}

export default async function QuickAddTaskCommand(
  props: LaunchProps<{
    arguments: { title: string; priority?: string; project?: string };
  }>,
) {
  const { title, priority, project } = props.arguments;
  const { defaultProject } = getPreferenceValues<Preferences>();

  if (!title.trim()) {
    await showHUD("Task title is required");
    return;
  }

  try {
    let projectId = defaultProject || undefined;

    if (project?.trim()) {
      const projects = await getProjects();
      const match = projects.find(
        (p) => p.name.toLowerCase() === project.trim().toLowerCase(),
      );
      if (match) {
        projectId = match.id;
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: `Project "${project.trim()}" not found`,
          message: "Using default project instead",
        });
      }
    }

    await createTask({
      title: title.trim(),
      projectId,
      priority: parsePriority(priority),
    });
    await showHUD(`✓ "${title.trim()}" added`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create task",
      message: String(error),
    });
  }
}
