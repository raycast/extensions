import { environment } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

const LOCK_FILE = path.join(environment.supportPath, "active_task.json");

export interface TaskState {
  id: string;
  name: string;
  timestamp: number;
}

export function readTaskState(): TaskState | null {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      return JSON.parse(fs.readFileSync(LOCK_FILE, "utf-8"));
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function writeTaskState(state: TaskState) {
  try {
    const dir = path.dirname(LOCK_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCK_FILE, JSON.stringify(state), "utf-8");
  } catch (e) {
    // ignore
  }
}

export function clearTaskState() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (e) {
    // ignore
  }
}

export function registerTask(commandName: string): {
  signal: AbortSignal;
  cleanup: () => void;
  isDuplicate: boolean;
  id: string;
} {
  const currentState = readTaskState();
  let isDuplicate = false;

  if (currentState) {
    if (currentState.name === commandName) {
      isDuplicate = true;
      clearTaskState();
    }
  }

  const id = crypto.randomUUID();
  if (!isDuplicate) {
    writeTaskState({ id, name: commandName, timestamp: Date.now() });
  }

  const controller = new AbortController();

  let interval: NodeJS.Timeout | undefined;

  if (!isDuplicate) {
    interval = setInterval(() => {
      const state = readTaskState();
      if (!state || state.id !== id) {
        controller.abort(new Error("AbortError"));
        if (interval) clearInterval(interval);
      }
    }, 300);
  }

  const cleanup = () => {
    if (interval) clearInterval(interval);
    const state = readTaskState();
    if (state && state.id === id) {
      clearTaskState();
    }
  };

  return { signal: controller.signal, cleanup, isDuplicate, id };
}
