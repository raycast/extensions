// src/utils/storage.ts

import { LocalStorage } from "@raycast/api"; // Import LocalStorage from Raycast API
import { Directory, Tag } from "./types"; // Import interfaces from types.ts

const DIRECTORIES_KEY = "directories";
const TAGS_KEY = "tags";

// =====================
// Directory Management
// =====================

// Retrieve all directories
export const getDirectories = async (): Promise<Directory[]> => {
  const dirs = await LocalStorage.getItem(DIRECTORIES_KEY);
  return typeof dirs === "string" ? JSON.parse(dirs) : [];
};

// Add a new directory
export const addDirectory = async (directory: Directory): Promise<void> => {
  const dirs = await getDirectories();
  dirs.push(directory);
  await LocalStorage.setItem(DIRECTORIES_KEY, JSON.stringify(dirs));
};

// Update an existing directory
export const updateDirectory = async (updatedDir: Directory): Promise<void> => {
  const dirs = await getDirectories();
  const index = dirs.findIndex((dir) => dir.id === updatedDir.id);
  if (index !== -1) {
    dirs[index] = updatedDir;
    await LocalStorage.setItem(DIRECTORIES_KEY, JSON.stringify(dirs));
  }
};

// Remove a directory by ID
export const removeDirectory = async (id: string): Promise<void> => {
  const dirs = await getDirectories();
  const filtered = dirs.filter((dir) => dir.id !== id);
  await LocalStorage.setItem(DIRECTORIES_KEY, JSON.stringify(filtered));
};

// Clear all directories
export const clearDirectories = async (): Promise<void> => {
  try {
    await LocalStorage.removeItem(DIRECTORIES_KEY);
  } catch (error) {
    console.error("Failed to clear directories:", error);
    throw error;
  }
};

// =====================
// Tag Management
// =====================

// Retrieve all tags
export const getTags = async (): Promise<Tag[]> => {
  const tags = await LocalStorage.getItem(TAGS_KEY);
  return typeof tags === "string" ? JSON.parse(tags) : [];
};

// Add a new tag
export const addTag = async (tag: Tag): Promise<void> => {
  const tags = await getTags();
  tags.push(tag);
  await LocalStorage.setItem(TAGS_KEY, JSON.stringify(tags));
};

// Update an existing tag
export const updateTag = async (updatedTag: Tag): Promise<void> => {
  const tags = await getTags();
  const index = tags.findIndex((t) => t.id === updatedTag.id);
  if (index !== -1) {
    tags[index] = updatedTag;
    await LocalStorage.setItem(TAGS_KEY, JSON.stringify(tags));
  }
};

// Remove a tag by ID and update directories
export const removeTag = async (id: string): Promise<void> => {
  const tags = await getTags();
  const filtered = tags.filter((t) => t.id !== id);
  await LocalStorage.setItem(TAGS_KEY, JSON.stringify(filtered));

  // Remove the tag from all directories
  const dirs = await getDirectories();
  dirs.forEach((dir) => {
    dir.tags = dir.tags.filter((tagId) => tagId !== id);
  });
  await LocalStorage.setItem(DIRECTORIES_KEY, JSON.stringify(dirs));
};

// Export interfaces and functions
export type { Directory, Tag };
