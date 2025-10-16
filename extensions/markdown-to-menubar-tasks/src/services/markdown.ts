import * as fs from "fs/promises";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  markdownFilePath: string;
}

export type Task = {
  text: string;
  isCompleted: boolean;
  section?: string;
};

export type TaskSection = {
  title: string;
  tasks: Task[];
};

/**
 * Fetches the raw content of a markdown file
 */
export async function fetchMarkdownFile(): Promise<string> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const filePath = preferences.markdownFilePath;

    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    console.error("Error reading markdown file:", error);
    throw new Error("Failed to read markdown file. Please check the file path in preferences.");
  }
}

/**
 * Parses tasks from a markdown file and organizes them by section
 */
export async function fetchTasks(): Promise<TaskSection[]> {
  try {
    const content = await fetchMarkdownFile();
    const sections: TaskSection[] = [];
    let currentSection: TaskSection | null = null;

    // Split content into lines
    const lines = content.split("\n");

    for (const line of lines) {
      // Check for headers (e.g., "# Work Tasks")
      const headerMatch = line.match(/^#+\s+(.+)/);
      if (headerMatch) {
        if (currentSection) {
          // Only add sections that have tasks and don't start with IGNORE
          if (currentSection.tasks.length > 0 && !currentSection.title.startsWith("IGNORE")) {
            sections.push(currentSection);
          }
        }
        currentSection = {
          title: headerMatch[1],
          tasks: [],
        };
        continue;
      }

      // Check for tasks - only add if not in an IGNORE section
      const taskMatch = line.match(/^- \[(x| )\] (.+)/);
      if (taskMatch && currentSection && !currentSection.title.startsWith("IGNORE")) {
        currentSection.tasks.push({
          isCompleted: taskMatch[1] === "x",
          text: taskMatch[2].trim(),
          section: currentSection.title,
        });
      }
    }

    // Don't forget to add the last section (if it's not an IGNORE section and has tasks)
    if (currentSection && currentSection.tasks.length > 0 && !currentSection.title.startsWith("IGNORE")) {
      sections.push(currentSection);
    }

    return sections;
  } catch (error) {
    console.error("Error parsing tasks:", error);
    throw new Error("Failed to parse tasks");
  }
}

/**
 * Updates a task's completion status in the markdown file
 */
export async function updateTaskInFile(taskText: string, setCompleted: boolean): Promise<void> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const filePath = preferences.markdownFilePath;

    const content = await fs.readFile(filePath, "utf-8");

    // Replace the task status while preserving the task text
    const updatedContent = content.replace(
      new RegExp(`- \\[([ x])\\] ${taskText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"),
      `- [${setCompleted ? "x" : " "}] ${taskText}`,
    );

    await fs.writeFile(filePath, updatedContent, "utf-8");
  } catch (error) {
    console.error("Error updating task:", error);
    throw new Error("Failed to update task");
  }
}
