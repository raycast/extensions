import { constants, promises as fs } from "fs";
import path from "path";
import { applyTemplates } from "./templating/templating.service";

export interface CaptureValues {
  type: "daily" | "todo" | "shopping";
  text: string;
}

interface CapturePreferences {
  dailyNotePath?: string;
  todoNotePath?: string;
  shoppingNotePath?: string;
}

async function resolveNotePath(vaultPath: string, relativePath: string): Promise<string> {
  if (path.isAbsolute(relativePath)) {
    throw new Error("The capture file path must be relative to the selected vault.");
  }

  if (path.extname(relativePath).toLowerCase() !== ".md") {
    throw new Error("The capture file must be a Markdown (.md) file.");
  }

  const vault = await fs.realpath(vaultPath);
  const note = await fs.realpath(path.resolve(vault, relativePath));
  const relative = path.relative(vault, note);

  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("The capture file must stay inside the selected vault.");
  }

  if (path.extname(note).toLowerCase() !== ".md" || !(await fs.stat(note)).isFile()) {
    throw new Error("The capture file must be an existing regular Markdown (.md) file.");
  }

  return note;
}

export async function saveQuickCapture(vaultPath: string, values: CaptureValues, preferences: CapturePreferences) {
  const routes = {
    daily: { path: preferences.dailyNotePath, title: "Daily Note" },
    todo: { path: preferences.todoNotePath, title: "To Do" },
    shopping: { path: preferences.shoppingNotePath, title: "Shopping" },
  };
  const route = routes[values.type];
  if (!route.path?.trim()) {
    throw new Error(`Configure a ${route.title} path first.`);
  }
  if (!values.text.trim()) {
    throw new Error("Enter text before saving.");
  }

  const expandedPath = await applyTemplates("", route.path);
  const notePath = await resolveNotePath(vaultPath, expandedPath);
  const content = (await applyTemplates(values.text.trim())).trim();
  if (!content) {
    throw new Error("Enter text before saving.");
  }
  const prefix = values.type === "todo" ? "- [ ] " : "- ";
  const entry = prefix + content.replace(/\r?\n/g, "\n  ");

  // Append to an existing file without creating a missing capture target.
  const file = await fs.open(notePath, constants.O_WRONLY | constants.O_APPEND);
  try {
    await file.appendFile(`\n${entry}`);
  } finally {
    await file.close();
  }
}
