import { LocalStorage } from "@raycast/api";

export interface RenderHistory {
  id: string;
  projectPath: string;
  aeVersion: string;
  startTime: Date;
  endTime?: Date;
  totalFrames?: number;
  duration?: number;
  status: "running" | "completed" | "failed";
  error?: string;
  pid?: number;
}

const HISTORY_KEY = "render-history";
const MAX_HISTORY = 20;

export async function getRenderHistory(): Promise<RenderHistory[]> {
  try {
    const historyJson = await LocalStorage.getItem<string>(HISTORY_KEY);
    if (!historyJson) return [];

    const history = JSON.parse(historyJson) as RenderHistory[];
    return history.map((item) => ({
      ...item,
      startTime: new Date(item.startTime),
      endTime: item.endTime ? new Date(item.endTime) : undefined,
    }));
  } catch (error) {
    console.error("Failed to parse render history, resetting:", error);
    await LocalStorage.removeItem(HISTORY_KEY);
    return [];
  }
}

export async function addRenderToHistory(render: RenderHistory): Promise<void> {
  try {
    const history = await getRenderHistory();
    history.unshift(render);
    const trimmedHistory = history.slice(0, MAX_HISTORY);

    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error("Failed to add render to history:", error);
  }
}

export async function updateRenderInHistory(id: string, updates: Partial<RenderHistory>): Promise<void> {
  try {
    const history = await getRenderHistory();
    const index = history.findIndex((r) => r.id === id);

    if (index !== -1) {
      history[index] = { ...history[index], ...updates };
      await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  } catch (error) {
    console.error("Failed to update render in history:", error);
    // Silently fail - don't block render completion
  }
}

export async function getRecentRenderTime(projectPath: string): Promise<string | null> {
  try {
    const history = await getRenderHistory();
    const recentRender = history.find((r) => r.projectPath === projectPath && r.status === "completed" && r.duration);

    if (recentRender && recentRender.duration) {
      return formatDuration(recentRender.duration);
    }

    return null;
  } catch (error) {
    console.error("Failed to get recent render time:", error);
    return null;
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
