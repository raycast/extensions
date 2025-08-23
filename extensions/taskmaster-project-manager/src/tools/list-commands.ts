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
    const guidePath = path.join(process.cwd(), "TM_COMMANDS_GUIDE copy.md");

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

## Core Commands
- \`tm list\` - List all tasks with filters
- \`tm show <id>\` - Show detailed task information  
- \`tm next\` - Get next recommended task
- \`tm status\` - Show project dashboard
- \`tm analyze-complexity\` - Analyze task complexity
- \`tm validate-dependencies\` - Check dependency issues

## Task Management
- \`tm add-task\` - Create a new task
- \`tm update\` - Update task information
- \`tm set-status\` - Change task status
- \`tm expand <id>\` - Break down complex tasks

## Analysis & Insights
- \`tm utils/analyze\` - Comprehensive project analysis
- \`tm complexity-report\` - View complexity analysis
- \`tm workflows/smart-flow\` - Show recommended workflows

*Note: Full command guide not found. Check TM_COMMANDS_GUIDE.md for complete reference.*`;
  } catch (error) {
    return `Error reading commands: ${String(error)}`;
  }
}
