import { LocalStorage } from "@raycast/api";
import { Palette, Collection } from "../types";
import { randomUUID } from "crypto";

const PALETTE_KEY = "saved_palettes";
const COLLECTION_KEY = "saved_collections";

// Palettes
export async function getPalettes(): Promise<Palette[]> {
  const data = await LocalStorage.getItem<string>(PALETTE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as Palette[];
  } catch (e) {
    console.error("Failed to parse palettes", e);
    return [];
  }
}

export async function savePalette(palette: Palette): Promise<void> {
  const current = await getPalettes();
  // Check if exists and update, or add new
  const index = current.findIndex((p) => p.id === palette.id);
  let updated;
  if (index >= 0) {
    updated = [...current];
    updated[index] = palette;
  } else {
    updated = [palette, ...current];
  }
  await LocalStorage.setItem(PALETTE_KEY, JSON.stringify(updated));
}

export async function deletePalette(id: string): Promise<void> {
  const current = await getPalettes();
  const updated = current.filter((p) => p.id !== id);
  await LocalStorage.setItem(PALETTE_KEY, JSON.stringify(updated));
}

export async function renamePalette(id: string, newName: string): Promise<void> {
  const current = await getPalettes();
  const updated = current.map((p) => {
    if (p.id === id) {
      return { ...p, name: newName };
    }
    return p;
  });
  await LocalStorage.setItem(PALETTE_KEY, JSON.stringify(updated));
}

export async function movePaletteToCollection(paletteId: string, collectionId: string | undefined): Promise<void> {
  const current = await getPalettes();
  const updated = current.map((p) => {
    if (p.id === paletteId) {
      return { ...p, collectionId };
    }
    return p;
  });
  await LocalStorage.setItem(PALETTE_KEY, JSON.stringify(updated));
}

export async function duplicatePalette(id: string): Promise<void> {
  const current = await getPalettes();
  const target = current.find((p) => p.id === id);
  if (!target) return;

  const copy: Palette = {
    ...target,
    id: randomUUID(),
    name: `${target.name} Copy`,
    createdAt: Date.now(),
  };

  const updated = [copy, ...current];
  await LocalStorage.setItem(PALETTE_KEY, JSON.stringify(updated));
}

// Collections
export async function getCollections(): Promise<Collection[]> {
  const data = await LocalStorage.getItem<string>(COLLECTION_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as Collection[];
  } catch (e) {
    console.error("Failed to parse collections", e);
    return [];
  }
}

export async function saveCollection(collection: Collection): Promise<void> {
  const current = await getCollections();
  const updated = [collection, ...current];
  await LocalStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
}

export async function deleteCollection(id: string): Promise<void> {
  const current = await getCollections();
  const updated = current.filter((c) => c.id !== id);
  await LocalStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));

  // Remove collectionId from palettes
  const palettes = await getPalettes();
  const updatedPalettes = palettes.map((p) => {
    if (p.collectionId === id) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { collectionId: _unused, ...rest } = p;
      return rest as Palette;
    }
    return p;
  });
  await LocalStorage.setItem(PALETTE_KEY, JSON.stringify(updatedPalettes));
}

export async function renameCollection(id: string, newName: string): Promise<void> {
  const current = await getCollections();
  const updated = current.map((c) => {
    if (c.id === id) {
      return { ...c, name: newName };
    }
    return c;
  });
  await LocalStorage.setItem(COLLECTION_KEY, JSON.stringify(updated));
}
