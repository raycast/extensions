import { LocalStorage } from "@raycast/api";
import { TaskRecording, RecordingSession } from "../types";

const RECORDINGS_KEY = "task_recordings";
const ACTIVE_SESSION_KEY = "active_recording_session";

export async function saveRecording(recording: TaskRecording): Promise<void> {
  const existingRecordings = await getRecordings();
  const updatedRecordings = [
    ...existingRecordings.filter((r) => r.id !== recording.id),
    recording,
  ];
  await LocalStorage.setItem(RECORDINGS_KEY, JSON.stringify(updatedRecordings));
}

export async function getRecordings(): Promise<TaskRecording[]> {
  const stored = await LocalStorage.getItem<string>(RECORDINGS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export async function getRecordingsByUser(
  userName: string
): Promise<TaskRecording[]> {
  const recordings = await getRecordings();
  return recordings.filter((r) => r.userName === userName);
}

export async function deleteRecording(recordingId: string): Promise<void> {
  const recordings = await getRecordings();
  const filtered = recordings.filter((r) => r.id !== recordingId);
  await LocalStorage.setItem(RECORDINGS_KEY, JSON.stringify(filtered));
}

export async function saveActiveSession(
  session: RecordingSession
): Promise<void> {
  try {
    await LocalStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Error saving active session:", error);
    throw new Error("Failed to save recording session");
  }
}

export async function getActiveSession(): Promise<RecordingSession | null> {
  try {
    const stored = await LocalStorage.getItem<string>(ACTIVE_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Error getting active session:", error);
    return null;
  }
}

export async function clearActiveSession(): Promise<void> {
  await LocalStorage.removeItem(ACTIVE_SESSION_KEY);
}

export async function getCurrentUser(): Promise<string> {
  try {
    const stored = await LocalStorage.getItem<string>("current_user");
    if (stored) return stored;

    // Use environment variables or default to a safe fallback
    const userName =
      process.env.USER || process.env.USERNAME || `user_${Date.now()}`;
    await LocalStorage.setItem("current_user", userName);
    return userName;
  } catch (error) {
    console.error("Error getting current user:", error);
    return `user_${Date.now()}`;
  }
}
