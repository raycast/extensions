import { environment } from "@raycast/api";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export interface HistoryItem {
  id: string;
  text: string;
  timestamp: number;
}

const HISTORY_FILE = path.join(environment.supportPath, "history.json");

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const data = await fs.readFile(HISTORY_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveToHistory(text: string) {
  const history = await getHistory();
  const trimmedText = text.trim();

  if (!trimmedText) return;

  // Deduplicate: remove existing entry with same text
  const filteredHistory = history.filter((item) => item.text.trim() !== trimmedText);

  const newItem: HistoryItem = {
    id: crypto.randomUUID(),
    text: trimmedText,
    timestamp: Date.now(),
  };

  const newHistory = [newItem, ...filteredHistory].slice(0, 50); // Keep last 50

  await ensureSupportPath();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(newHistory, null, 2));
}

export async function removeFromHistory(id: string) {
  const history = await getHistory();
  const newHistory = history.filter((item) => item.id !== id);
  await fs.writeFile(HISTORY_FILE, JSON.stringify(newHistory, null, 2));
}

async function ensureSupportPath() {
  try {
    await fs.mkdir(environment.supportPath, { recursive: true });
  } catch {
    // Already exists or other error handled by writeFile/readFile
  }
}
