import { getPreferenceValues } from "@raycast/api";
import type { Prompt, Section } from "./types";
import fs from "fs";

export const getSections = (prompts: Prompt[]): Section[] => {
  const preferences = getPreferenceValues<Preferences>();

  const sections = Array.from(new Set(prompts.flatMap((prompt) => prompt.tags)));
  return sections
    .map((tag) => ({
      name: tag,
      slugs: prompts.filter((prompt) => prompt.tags.includes(tag)).map((prompt) => prompt.slug),
    }))
    .sort((a, b) =>
      preferences.prompts_sort_order === "desc" ? b.slugs.length - a.slugs.length : a.slugs.length - b.slugs.length,
    );
};

export const isImageUrl = (url: string): boolean => {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

  const isDataUri = url.startsWith("data:image/");

  const isImageExtension =
    imageExtensions.includes(url.substring(url.lastIndexOf(".")).toLowerCase()) || url.endsWith(".svg");

  return isDataUri || isImageExtension;
};

export const getTimestamp = (filePath: string): number => {
  const ifExists = fs.existsSync(filePath);
  if (!ifExists) {
    return -1; // if file not exists, return -1
  } else {
    return fs.statSync(filePath).mtimeMs;
  }
};
