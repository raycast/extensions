import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Project {
  name: string;
  path: string;
  icon: string;
}

const projects: Project[] = [
  {
    name: "proxy-benchmarking",
    path: "/Users/mohammadorabi/work/any-ip/proxy-benchmarking",
    icon: "📊",
  },
  {
    name: "codisar-erp",
    path: "/Users/mohammadorabi/work/codisar/codisar-erp",
    icon: "💼",
  },
  {
    name: "portfolio",
    path: "/Users/mohammadorabi/work/codisar/portfolio",
    icon: "🎨",
  },
  {
    name: "crdb-remix-app",
    path: "/Users/mohammadorabi/work/eric/crdb-remix-app",
    icon: "🗄️",
  },
  {
    name: "p2a-services",
    path: "/Users/mohammadorabi/work/playember/p2a-services",
    icon: "🔧",
  },
  {
    name: "p2a-client",
    path: "/Users/mohammadorabi/work/playember/p2a-client",
    icon: "📱",
  },
  {
    name: "third-web-api",
    path: "/Users/mohammadorabi/work/playember/third-web-api",
    icon: "🌐",
  },
];

async function openProject(project: Project) {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Opening ${project.name}...`,
    });

    // Close all Cursor windows by quitting and reopening
    try {
      // Check if Cursor is running
      const { stdout } = await execAsync('pgrep -f "Cursor"').catch(() => ({
        stdout: "",
      }));

      if (stdout.trim()) {
        // Cursor is running, quit it
        await execAsync(
          "osascript -e 'tell application \"Cursor\" to quit'"
        ).catch(() => {
          // Ignore quit errors
        });

        // Wait for it to fully quit
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      // Continue even if there's an error
    }

    // Close all iTerm2 windows
    const closeITermScript = `
      tell application "System Events"
        if (name of processes) contains "iTerm2" then
          tell application "iTerm2"
            set windowCount to count of windows
            repeat with i from 1 to windowCount
              try
                close window 1
              end try
            end repeat
          end tell
        end if
      end tell
    `;

    await execAsync(`osascript -e '${closeITermScript}'`).catch(() => {
      // Ignore iTerm close errors
    });

    // Wait for windows to close
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Open Cursor with the project
    try {
      // Try using the cursor CLI command first (if available)
      await execAsync(`cursor "${project.path}"`);
    } catch {
      // Fallback to open command
      await execAsync(`open -a "Cursor" "${project.path}"`);
    }

    // Wait a moment for Cursor to open
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Open iTerm2 and run claude
    const openITermScript = `
      tell application "iTerm2"
        activate
        create window with default profile
        tell current session of current window
          write text "cd '${project.path}'"
          write text "claude"
        end tell
      end tell
    `;

    await execAsync(`osascript -e '${openITermScript}'`).catch(() => {
      // Ignore iTerm open errors
    });

    await showToast({
      style: Toast.Style.Success,
      title: `✅ Launched ${project.name}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error opening project",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default function OpenProjects() {
  return (
    <List searchBarPlaceholder="Search projects..." filtering={true}>
      {projects.map((project) => (
        <List.Item
          key={project.name}
          icon={project.icon}
          title={project.name}
          subtitle={project.path}
          actions={
            <ActionPanel>
              <Action
                title="Open Project"
                onAction={() => openProject(project)}
              />
              <Action
                title="Open in Finder"
                onAction={() => exec(`open "${project.path}"`)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
