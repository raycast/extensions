/**
 * Lists all available TaskMaster Raycast extension commands and their descriptions.
 * Provides comprehensive overview of viewing commands (Kanban Board, Task List, Search),
 * management commands (Add Task), and AI assistant tools available to users
 * for effective TaskMaster project interaction and workflow optimization.
 */

import fs from "fs";
import path from "path";

export default async function () {
  try {
    // Read the TaskMaster commands guide
    const guidePath = path.join(process.cwd(), "TM_COMMANDS_GUIDE.md");

    if (fs.existsSync(guidePath)) {
      const content = fs.readFileSync(guidePath, "utf-8");

      // Extract command sections for a cleaner response
      const lines = content.split("\n");
      let result = "# TaskMaster Commands Reference\n\n";
      let inCommandSection = false;

      for (const line of lines) {
        // Start capturing from "Complete Command Reference"
        if (line.includes("Complete Command Reference")) {
          inCommandSection = true;
          result += "## " + line.replace("## ", "") + "\n\n";
          continue;
        }

        // Stop at migration or tips section
        if (
          inCommandSection &&
          (line.includes("Migration from") || line.includes("Tips"))
        ) {
          break;
        }

        if (inCommandSection) {
          result += line + "\n";
        }
      }

      return result;
    }

    // Fallback command list if guide not found
    return `# TaskMaster Commands Reference

## Raycast Commands
- Kanban Board — View and manage tasks in a visual Kanban board with drag-and-drop
- Task List — Browse all tasks with filters and quick actions
- Search Tasks — Search and filter tasks with advanced options
- Next Task — See the next recommended task based on dependencies and priority
- Project Status — Project dashboard with progress insights
- Add Task — Create a new task with validation
- Task Detail — View detailed task info, subtasks, and dependencies

## Tips
- Use ⌘R to refresh lists
- Use the Copy submenu to copy IDs, titles, and JSON
- Open a task’s detail from Kanban or Task List to see metadata

Note: Full command guide not found. Ensure TM_COMMANDS_GUIDE.md exists at the project root.`;
  } catch (error) {
    return `Error reading commands: ${String(error)}`;
  }
}
