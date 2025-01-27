import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface Memory {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  imagePath: string;
}

interface Preferences {
  storageDir?: string;
}

const DEFAULT_STORAGE_DIR = join(homedir(), ".raycast-recall");

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const storageDir = preferences.storageDir || DEFAULT_STORAGE_DIR;

    // Ensure storage directory exists
    if (!existsSync(storageDir)) {
      mkdirSync(storageDir, { recursive: true });
    }

    // Generate timestamp and ID
    const now = new Date();
    const timestamp = now.toISOString();
    const id = `memory-${timestamp}`;

    // Take screenshot using macOS screencapture with interactive selection
    const imagePath = join(storageDir, `${id}.png`);
    execSync(`sleep 0.02 && /usr/sbin/screencapture -i "${imagePath}"`);

    // Create memory object
    const memory: Memory = {
      id,
      title: `Memory @ ${now.toLocaleString()}`,
      description: "",
      timestamp,
      imagePath,
    };

    // Load existing memories
    const memoriesPath = join(storageDir, "memories.json");
    let memories: Memory[] = [];
    if (existsSync(memoriesPath)) {
      memories = JSON.parse(readFileSync(memoriesPath, "utf-8"));
    }

    // Add new memory
    memories.push(memory);
    writeFileSync(memoriesPath, JSON.stringify(memories, null, 2));

    // Show success message and open dashboard
    await showToast({
      style: Toast.Style.Success,
      title: "Memory Captured!",
      message: "Opening editor...",
    });

    // Open the memory dashboard focused on the new memory in edit mode
    await open(`raycast://extensions/matthew_su/recall/memory-dashboard?id=${id}&isEditing=true`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to capture memory",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
