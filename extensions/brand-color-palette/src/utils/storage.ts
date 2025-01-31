import { LocalStorage } from "@raycast/api";
import { ColorPaletteItem, PrimitiveColor, TokenColor } from "../types";
import { v4 as uuidv4 } from "uuid";

const COLORS_STORAGE_KEY = "colors";

export async function getColors(): Promise<ColorPaletteItem[]> {
  try {
    const stored = await LocalStorage.getItem<string>(COLORS_STORAGE_KEY);
    const colors = stored ? JSON.parse(stored) : [];
    return colors.sort((a: ColorPaletteItem, b: ColorPaletteItem) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to get colors:", error);
    return [];
  }
}

export async function saveColors(colors: ColorPaletteItem[]): Promise<void> {
  try {
    const sorted = colors.sort((a: ColorPaletteItem, b: ColorPaletteItem) => a.name.localeCompare(b.name));
    await LocalStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(sorted));
  } catch (error) {
    console.error("Failed to save colors:", error);
    throw new Error("Failed to save colors");
  }
}

export async function addColor(color: Omit<PrimitiveColor, "id"> | Omit<TokenColor, "id">): Promise<void> {
  try {
    const colors = await getColors();
    const newColor = {
      ...color,
      id: uuidv4(),
    };
    colors.push(newColor);
    await saveColors(colors);
  } catch (error) {
    console.error("Failed to add color:", error);
    throw new Error("Failed to add color");
  }
}

export async function updateColor(updatedColor: ColorPaletteItem): Promise<void> {
  try {
    const colors = await getColors();
    const filtered = colors.filter((c) => c.id !== updatedColor.id);
    filtered.push(updatedColor);
    await saveColors(filtered);
  } catch (error) {
    console.error("Failed to update color:", error);
    throw new Error("Failed to update color");
  }
}

export async function deleteColor(id: string): Promise<void> {
  try {
    const colors = await getColors();
    const filtered = colors.filter((c) => c.id !== id);
    await saveColors(filtered);
  } catch (error) {
    console.error("Failed to delete color:", error);
    throw new Error("Failed to delete color");
  }
}

// Helper functions with proper type safety
export function getPrimitives(colors: ColorPaletteItem[]): PrimitiveColor[] {
  return colors.filter((c): c is PrimitiveColor => c.type === "primitive");
}

export function getTokens(colors: ColorPaletteItem[]): TokenColor[] {
  return colors.filter((c): c is TokenColor => c.type === "token");
}

// Helper to find a color by ID with proper type narrowing
export function findColorById(colors: ColorPaletteItem[], id: string): ColorPaletteItem | undefined {
  return colors.find((c) => c.id === id);
}
