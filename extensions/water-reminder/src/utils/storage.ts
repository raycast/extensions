import { environment } from "@raycast/api";
import { promises as fs } from "fs";
import path from "path";

export interface WaterLog {
  timestamp: string; // ISO string
  amount: number; // in ml
  note?: string;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalAmount: number;
  logs: WaterLog[];
  goal: number;
  percentage: number;
}

const DATA_DIR = path.join(environment.supportPath, "water-logs");
const getDataFilePath = (date: string) => path.join(DATA_DIR, `${date}.json`);

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create data directory:", error);
  }
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  return formatLocalDateKey(new Date());
}

// Load logs for a specific date
export async function loadLogs(date: string): Promise<WaterLog[]> {
  await ensureDataDir();
  const filePath = getDataFilePath(date);

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as WaterLog[];
  } catch {
    // File doesn't exist or is invalid, return empty array
    return [];
  }
}

// Save logs for a specific date
export async function saveLogs(date: string, logs: WaterLog[]): Promise<void> {
  await ensureDataDir();
  const filePath = getDataFilePath(date);

  try {
    await fs.writeFile(filePath, JSON.stringify(logs, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save logs:", error);
    throw error;
  }
}

// Add a new water log entry
export async function addWaterLog(
  amount: number,
  note?: string,
): Promise<WaterLog> {
  const today = getTodayDate();
  const logs = await loadLogs(today);

  const newLog: WaterLog = {
    timestamp: new Date().toISOString(),
    amount,
    note,
  };

  logs.push(newLog);
  await saveLogs(today, logs);

  return newLog;
}

// Get daily statistics
export async function getDailyStats(
  date: string,
  goal: number,
): Promise<DailyStats> {
  const logs = await loadLogs(date);
  const totalAmount = logs.reduce((sum, log) => sum + log.amount, 0);

  return {
    date,
    totalAmount,
    logs,
    goal,
    percentage: goal > 0 ? Math.round((totalAmount / goal) * 100) : 0,
  };
}

// Delete a specific log entry
export async function deleteWaterLog(
  date: string,
  timestamp: string,
): Promise<void> {
  const logs = await loadLogs(date);
  const filteredLogs = logs.filter((log) => log.timestamp !== timestamp);
  await saveLogs(date, filteredLogs);
}

// Get all available log dates
export async function getAvailableDates(): Promise<string[]> {
  await ensureDataDir();

  try {
    const files = await fs.readdir(DATA_DIR);
    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""))
      .sort()
      .reverse(); // Most recent first
  } catch {
    return [];
  }
}
