import { LaunchType, LocalStorage, launchCommand, updateCommandMetadata } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

export const STORAGE_KEY = "cortisol-level";
export const DEFAULT_LEVEL = "medium";
export const LEVELS = ["low", "medium", "high"] as const;

export type CortisolLevel = (typeof LEVELS)[number];

export const LEVEL_DETAILS: Record<
  CortisolLevel,
  {
    title: string;
    description: string;
    color: string;
    menuBarIcon: string;
    rank: number;
  }
> = {
  low: {
    title: "Low",
    description: "A calm bucket for low perceived cortisol.",
    color: "#2ab074",
    menuBarIcon: "menubar-low.png",
    rank: 0,
  },
  medium: {
    title: "Medium",
    description: "The default middle bucket for moderate perceived cortisol.",
    color: "#e2a432",
    menuBarIcon: "menubar-medium.png",
    rank: 1,
  },
  high: {
    title: "High",
    description: "A high bucket for elevated perceived cortisol.",
    color: "#e04a4a",
    menuBarIcon: "menubar-high.png",
    rank: 2,
  },
};

export function parseStoredLevel(value: unknown): CortisolLevel {
  if (typeof value !== "string") {
    return DEFAULT_LEVEL;
  }

  const parsed = normalizeLevel(value);
  if (parsed !== DEFAULT_LEVEL || value === DEFAULT_LEVEL) {
    return parsed;
  }

  try {
    return normalizeLevel(JSON.parse(value));
  } catch {
    return DEFAULT_LEVEL;
  }
}

export function normalizeLevel(value: unknown): CortisolLevel {
  return LEVELS.includes(value as CortisolLevel) ? (value as CortisolLevel) : DEFAULT_LEVEL;
}

export async function getCortisolLevel(): Promise<CortisolLevel> {
  return parseStoredLevel(await LocalStorage.getItem<string>(STORAGE_KEY));
}

export async function setCortisolLevel(level: CortisolLevel): Promise<CortisolLevel> {
  await LocalStorage.setItem(STORAGE_KEY, level);
  await updateCortisolCommandMetadata(level);
  return level;
}

export function getIncreasedLevel(level: CortisolLevel): CortisolLevel {
  return LEVELS[Math.min(LEVELS.length - 1, LEVEL_DETAILS[level].rank + 1)];
}

export function getLoweredLevel(level: CortisolLevel): CortisolLevel {
  return LEVELS[Math.max(0, LEVEL_DETAILS[level].rank - 1)];
}

export async function increaseCortisolLevel(): Promise<CortisolLevel> {
  const level = await getCortisolLevel();
  return setCortisolLevel(getIncreasedLevel(level));
}

export async function lowerCortisolLevel(): Promise<CortisolLevel> {
  const level = await getCortisolLevel();
  return setCortisolLevel(getLoweredLevel(level));
}

export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "cortisol-menu-bar", type: LaunchType.Background });
  } catch (error) {
    console.error("Unable to refresh Cortisol Menu Bar", error);
  }
}

export function formatLevel(level: CortisolLevel): string {
  return LEVEL_DETAILS[level].title;
}

export async function updateCortisolCommandMetadata(level: CortisolLevel): Promise<void> {
  try {
    await updateCommandMetadata({ subtitle: `Cortisol: ${formatLevel(level)}` });
  } catch (error) {
    console.error("Unable to update Cortisol command metadata", error);
  }
}

export function useCortisolLevel() {
  const [level, setLevel] = useState<CortisolLevel>(DEFAULT_LEVEL);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadLevel() {
      const storedLevel = await getCortisolLevel();
      if (isMounted) {
        setLevel(storedLevel);
        setIsLoading(false);
      }
      await updateCortisolCommandMetadata(storedLevel);
    }

    loadLevel();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateLevel = useCallback(async (nextLevel: CortisolLevel) => {
    setLevel(nextLevel);
    await setCortisolLevel(nextLevel);
  }, []);

  return { level, setLevel: updateLevel, isLoading };
}
