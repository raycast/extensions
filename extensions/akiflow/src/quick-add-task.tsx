import { closeMainWindow, popToRoot, getPreferenceValues, LaunchProps, Toast, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Akiflow, viewTaskInAkiflow, openAkiflow } from "../utils/akiflow";

type QuickAddTaskProps = { arguments: Arguments.QuickAddTask } & LaunchProps;

async function QuickAddTask(props: QuickAddTaskProps) {
  const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
  await toast.show();

  try {
    const preferences = getPreferenceValues<Preferences.QuickAddTask>();
    const refreshToken = getPreferenceValues<Preferences>().refreshToken;

    if (preferences.shouldCloseMainWindow) {
      await closeMainWindow();
      popToRoot({ clearSearchBar: true });
    }

    const akiflow = new Akiflow(refreshToken);

    const title = props.arguments.text ?? props.fallbackText;

    const task: {
      title: string;
      description?: string;
      status: number;
      listId?: string;
    } = {
      title: title,
      status: 1, // Inbox
    };

    if (props.arguments.description) {
      task.description = props.arguments.description;
    }

    let debugMessage = "";

    // Handle project selection
    if (props.arguments.project) {
      await akiflow.projectsPromise; // Wait for projects to be fetched
      const projectName = props.arguments.project.toLowerCase().trim();

      // Get all projects (including folders without colors)
      const validProjects = Object.entries(akiflow.projects);

      // Helper function to normalize strings (remove spaces, special chars)
      const normalize = (str: string) => str.toLowerCase().replace(/[\s-_|]/g, "");
      const normalizedSearch = normalize(projectName);

      // Score each project based on match quality (higher score = better match)
      const scoredProjects = validProjects.map(([id, project]) => {
        const titleLower = project.title.toLowerCase();
        const titleNormalized = normalize(project.title);
        let score = 0;

        // Exact match (highest priority)
        if (titleLower === projectName) {
          score = 1000;
        }
        // Exact match without spaces
        else if (titleNormalized === normalizedSearch) {
          score = 900;
        }
        // Starts with (prefer shorter titles)
        else if (titleLower.startsWith(projectName)) {
          score = 800 - project.title.length;
        }
        // Starts with (no spaces)
        else if (titleNormalized.startsWith(normalizedSearch)) {
          score = 700 - project.title.length;
        }
        // Word initials match
        else {
          const initials = project.title
            .split(/[\s-_|]+/)
            .filter((word) => word.length > 0)
            .map((word) => word[0])
            .join("")
            .toLowerCase();
          if (initials && initials === normalizedSearch) {
            score = 600;
          } else if (initials && initials.startsWith(normalizedSearch)) {
            score = 500;
          }
        }

        // Contains match (only if no better match, and prefer shorter titles)
        if (score === 0) {
          if (titleLower.includes(projectName)) {
            score = 400 - project.title.length;
          } else if (titleNormalized.includes(normalizedSearch)) {
            score = 300 - project.title.length;
          }
        }

        return { id, project, score };
      });

      // Sort by score (highest first) and get the best match
      const bestMatch = scoredProjects.filter((item) => item.score > 0).sort((a, b) => b.score - a.score)[0];

      if (bestMatch) {
        task.listId = bestMatch.id;
      } else {
        // Create debug message for toast - show ALL projects INCLUDING FOLDERS
        await akiflow.projectsPromise;
        const allProjectsIncludingFolders = Object.entries(akiflow.projects);

        debugMessage = `Search: "${props.arguments.project}" (normalized: "${normalizedSearch}")\n\n`;
        debugMessage += `Total projects in system: ${allProjectsIncludingFolders.length}\n\n`;

        debugMessage += `ALL PROJECTS:\n`;
        allProjectsIncludingFolders.forEach(([, project]) => {
          const normalized = normalize(project.title);
          const hasColor = project.color ? "✓" : "✗";
          debugMessage += `${hasColor} ${project.title}\n  norm: "${normalized}" color: ${project.color || "none"}\n`;
        });
      }
    }

    await akiflow.addSingleTask(task);

    toast.style = Toast.Style.Success;

    // Show which project was matched (if any)
    if (task.listId && akiflow.projects[task.listId]) {
      toast.title = `Task created in ${akiflow.projects[task.listId].title}`;
    } else if (props.arguments.project && !task.listId) {
      toast.title = `Project "${props.arguments.project}" not found`;
      toast.message = debugMessage;
    } else {
      toast.title = "Task created";
    }

    toast.primaryAction = {
      title: `View Task in Akiflow`,
      shortcut: { modifiers: ["cmd", "shift"], key: "o" },
      onAction: async () => {
        viewTaskInAkiflow(title);
      },
    };

    // If there's debug info, prioritize Copy Logs; otherwise Open Akiflow
    if (debugMessage) {
      toast.secondaryAction = {
        title: "Copy Debug Logs",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: async () => {
          await Clipboard.copy(debugMessage);
          toast.message = "Debug logs copied to clipboard!";
        },
      };
    } else {
      toast.secondaryAction = {
        title: "Open Akiflow",
        shortcut: { modifiers: ["cmd", "shift"], key: "a" },
        onAction: () => openAkiflow(),
      };
    }
  } catch (error) {
    await showFailureToast(error, { title: "Unable to create task" });
  }
}

export default QuickAddTask;
