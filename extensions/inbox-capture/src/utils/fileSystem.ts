import { promises as fs } from "fs";
import path from "path";
import { homedir } from "os";
import { confirmAlert } from "@raycast/api";
import { generateFrontmatter, generateTimestampFilename } from "./frontmatter";

export async function saveToInbox(
  content: string,
  inboxPath: string,
): Promise<void> {
  // Expand ~ to home directory
  const expandedPath = inboxPath.replace(/^~/, homedir());

  // Check if directory exists
  if (!(await directoryExists(expandedPath))) {
    const options = {
      title: "Create Inbox Directory?",
      message: `The inbox directory doesn't exist at: ${expandedPath}`,
      primaryAction: {
        title: "Create Directory",
        onAction: async () => {
          await createDirectory(expandedPath);
          await saveFile(expandedPath, content);
        },
      },
    };

    const confirmed = await confirmAlert(options);
    if (!confirmed) {
      throw new Error(
        "Inbox directory not found and user declined to create it",
      );
    }
  } else {
    await saveFile(expandedPath, content);
  }
}

async function saveFile(directory: string, content: string): Promise<void> {
  const filename = generateTimestampFilename();
  const frontmatter = generateFrontmatter();
  const fullContent = `${frontmatter}\n${content}`;
  const filepath = path.join(directory, filename);

  await fs.writeFile(filepath, fullContent, "utf8");
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function createDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}
