// storage.ts
import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { TimeEntry, Project } from "./models";
import { calculateDuration, roundDuration } from "./utils";

// Keys for localStorage
const TIME_ENTRIES_KEY = "timeEntries";
const PROJECTS_KEY = "projects";

// Get preferences
interface Preferences {
  roundingInterval: string;
}

// Time Entry Methods
export async function getTimeEntries(): Promise<TimeEntry[]> {
  const entriesJson = await LocalStorage.getItem<string>(TIME_ENTRIES_KEY);
  return entriesJson ? JSON.parse(entriesJson) : [];
}

export async function saveTimeEntry(entry: TimeEntry): Promise<void> {
  const entries = await getTimeEntries();
  const existingIndex = entries.findIndex((e) => e.id === entry.id);

  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }

  await LocalStorage.setItem(TIME_ENTRIES_KEY, JSON.stringify(entries));
}

export async function deleteTimeEntry(entryId: string): Promise<void> {
  const entries = await getTimeEntries();
  const updatedEntries = entries.filter((e) => e.id !== entryId);
  await LocalStorage.setItem(TIME_ENTRIES_KEY, JSON.stringify(updatedEntries));
}

// Gets the active timer if one exists
export async function getActiveTimer(): Promise<TimeEntry | null> {
  const entries = await getTimeEntries();
  return entries.find((entry) => entry.isActive) || null;
}

// Stops any active timer and returns it
// Automatically removes entries shorter than 1 minute
export async function stopActiveTimer(): Promise<TimeEntry | null> {
  const activeTimer = await getActiveTimer();

  if (activeTimer) {
    // Calculate the actual duration in minutes
    const startTime = new Date(activeTimer.startTime);
    const endTime = new Date();
    const actualDuration = calculateDuration(startTime, endTime);

    // If duration is less than 1 minute, remove the entry completely
    if (actualDuration < 1) {
      await deleteTimeEntry(activeTimer.id);
      return null;
    }

    // Get the rounding interval from preferences
    const preferences = getPreferenceValues<Preferences>();
    const roundingInterval = parseInt(preferences.roundingInterval, 10) || 15; // Default to 15 if not set

    // Round the duration according to the user's preference
    // We always want at least one interval for any timer that has been started and stopped
    const roundedDuration = roundDuration(actualDuration, roundingInterval);

    // Calculate a new end time based on the rounded duration
    // The end time should be at least the start time + one interval
    const roundedEndTime = new Date(startTime.getTime() + roundedDuration * 60 * 1000);

    // Update the timer with the rounded end time
    activeTimer.isActive = false;
    activeTimer.endTime = roundedEndTime.toISOString();

    await saveTimeEntry(activeTimer);
    return activeTimer;
  }

  return null;
}

// Project Methods
export async function getProjects(): Promise<Project[]> {
  const projectsJson = await LocalStorage.getItem<string>(PROJECTS_KEY);
  return projectsJson ? JSON.parse(projectsJson) : [];
}

export async function saveProject(project: Project): Promise<void> {
  const projects = await getProjects();
  const existingIndex = projects.findIndex((p) => p.id === project.id);

  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }

  await LocalStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export async function deleteProject(projectId: string): Promise<void> {
  const projects = await getProjects();
  const updatedProjects = projects.filter((p) => p.id !== projectId);
  await LocalStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));

  // Also remove project references from time entries
  const entries = await getTimeEntries();
  const updatedEntries = entries.map((entry) => {
    if (entry.projectId === projectId) {
      return { ...entry, projectId: undefined };
    }
    return entry;
  });

  await LocalStorage.setItem(TIME_ENTRIES_KEY, JSON.stringify(updatedEntries));
}

export async function getProjectById(projectId: string): Promise<Project | undefined> {
  const projects = await getProjects();
  return projects.find((project) => project.id === projectId);
}
