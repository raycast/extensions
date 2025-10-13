import fs from "fs-extra";
import path from "path";
import matter from "gray-matter";
import { getPreferenceValues } from "@raycast/api";
import { TaskFile, Task } from "../types";
import { parseTask } from "./taskParser";

export const getTasksFilePath = (): string => {
  const preferences = getPreferenceValues<Preferences>();
  const filePath = preferences.filePath;

  if (!filePath) {
    throw new Error("Tasks file path is not set");
  }

  return filePath;
};

export const getTargetFilePath = async (): Promise<string> => {
  return getTasksFilePath();
};

export const readTasksFromFile = async (filePath: string): Promise<TaskFile> => {
  try {
    // Create file if it doesn't exist
    if (!(await fs.pathExists(filePath))) {
      const dirPath = path.dirname(filePath);
      await fs.ensureDir(dirPath);

      const fileName = path.basename(filePath);
      const title = fileName.replace(".md", "");

      await fs.writeFile(filePath, `# ${title}\n\n`, "utf-8");
    }

    const content = await fs.readFile(filePath, "utf-8");
    let fileContent = "";

    try {
      // Try to parse with gray-matter, but don't fail if it can't parse
      const parsed = matter(content);
      fileContent = parsed.content;
    } catch (error) {
      console.error("Error parsing frontmatter, treating entire file as content:", error);
      fileContent = content;
    }

    const lines = fileContent.split("\n");
    const tasks: Task[] = [];

    lines.forEach((line, index) => {
      try {
        const task = parseTask(line, index);
        if (task) {
          task.filePath = filePath; // Set the file path for the task
          tasks.push(task);
        }
      } catch (error) {
        console.error(`Error processing line ${index}: "${line}"`, error);
        // Continue with next line
      }
    });

    return {
      content: content,
      tasks: tasks,
      path: filePath,
    };
  } catch (error) {
    console.error("Error reading tasks file:", error);
    throw error;
  }
};

export const readTasksFile = async (): Promise<TaskFile> => {
  try {
    const filePath = await getTargetFilePath();
    return readTasksFromFile(filePath);
  } catch (error) {
    console.error("Error reading tasks file:", error);
    throw error;
  }
};
