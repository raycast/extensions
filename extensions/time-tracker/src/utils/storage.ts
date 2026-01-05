import { promises as fs } from "fs";
import path from "path";
import {
  TimeData,
  Project,
  TimeEntry,
  NewTimeEntry,
  NewProject,
} from "./types";
import { getFinalDataPath } from "./config";

// Generate UUID v4
function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get the data file path from centralized config
function getDataFilePath(): string {
  return getFinalDataPath();
}

// Initialize empty data structure
function getEmptyData(): TimeData {
  return {
    projects: [],
    entries: [],
  };
}

// Ensure directory exists
async function ensureDirectory(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Read data from file
export async function readData(): Promise<TimeData> {
  const filePath = getDataFilePath();

  try {
    await ensureDirectory(filePath);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist or is invalid, return empty data
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const emptyData = getEmptyData();
      await writeData(emptyData);
      return emptyData;
    }
    throw error;
  }
}

// Write data to file
export async function writeData(data: TimeData): Promise<void> {
  const filePath = getDataFilePath();
  await ensureDirectory(filePath);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// --- Project operations ---

export async function getProjects(includeArchived = false): Promise<Project[]> {
  const data = await readData();
  return includeArchived
    ? data.projects
    : data.projects.filter((p) => !p.archived);
}

export async function getProject(id: string): Promise<Project | null> {
  const data = await readData();
  return data.projects.find((p) => p.id === id) || null;
}

export async function createProject(newProject: NewProject): Promise<Project> {
  const data = await readData();
  const project: Project = {
    id: generateId(),
    name: newProject.name,
    color: newProject.color,
    archived: false,
    createdAt: new Date().toISOString(),
  };
  data.projects.push(project);
  await writeData(data);
  return project;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, "id">>,
): Promise<Project | null> {
  const data = await readData();
  const index = data.projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  data.projects[index] = {
    ...data.projects[index],
    ...updates,
  };
  await writeData(data);
  return data.projects[index];
}

export async function deleteProject(id: string): Promise<boolean> {
  const data = await readData();
  const initialLength = data.projects.length;
  data.projects = data.projects.filter((p) => p.id !== id);

  if (data.projects.length === initialLength) return false;

  // Also delete all entries for this project
  data.entries = data.entries.filter((e) => e.projectId !== id);
  await writeData(data);
  return true;
}

// --- Time entry operations ---

export async function getEntries(): Promise<TimeEntry[]> {
  const data = await readData();
  return data.entries.sort((a, b) => {
    // Sort by date DESC, then by createdAt DESC
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function getEntry(id: string): Promise<TimeEntry | null> {
  const data = await readData();
  return data.entries.find((e) => e.id === id) || null;
}

export async function createEntry(newEntry: NewTimeEntry): Promise<TimeEntry> {
  const data = await readData();
  const entry: TimeEntry = {
    id: generateId(),
    projectId: newEntry.projectId,
    date: newEntry.date,
    duration: newEntry.duration,
    comment: newEntry.comment,
    createdAt: new Date().toISOString(),
  };
  data.entries.push(entry);
  await writeData(data);
  return entry;
}

export async function updateEntry(
  id: string,
  updates: Partial<Omit<TimeEntry, "id" | "createdAt">>,
): Promise<TimeEntry | null> {
  const data = await readData();
  const index = data.entries.findIndex((e) => e.id === id);
  if (index === -1) return null;

  data.entries[index] = {
    ...data.entries[index],
    ...updates,
  };
  await writeData(data);
  return data.entries[index];
}

export async function deleteEntry(id: string): Promise<boolean> {
  const data = await readData();
  const initialLength = data.entries.length;
  data.entries = data.entries.filter((e) => e.id !== id);

  if (data.entries.length === initialLength) return false;

  await writeData(data);
  return true;
}

// --- Helper: Get last used project ---

export async function getLastUsedProject(): Promise<Project | null> {
  const data = await readData();
  if (data.entries.length === 0) return null;

  // Get the most recent entry
  const sortedEntries = data.entries.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const lastProjectId = sortedEntries[0].projectId;

  return data.projects.find((p) => p.id === lastProjectId) || null;
}
