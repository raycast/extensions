// import { getPreferenceValues } from "@raycast/api";
import type { Prompt, Section } from "./types";
import fs from "fs";

export const getSections = (prompts: Prompt[], sortByPopularity: boolean): Section[] => {
  const sections = Array.from(new Set(prompts.flatMap((prompt) => prompt.tags)));
  const sectionsWithPrompts = sections.map((tag) => ({
    name: tag,
    prompts: prompts.filter((prompt) => prompt.tags.includes(tag)),
  }));

  if (sortByPopularity) {
    // Sort prompts within each section by count
    sectionsWithPrompts.forEach((section) => {
      section.prompts.sort((a, b) => (b.count || 0) - (a.count || 0));
    });
    // Sort sections by total count
    return sectionsWithPrompts
      .map((section) => ({
        name: section.name,
        slugs: section.prompts.map((prompt) => prompt.slug),
        totalCount: section.prompts.reduce((sum, prompt) => sum + (prompt.count || 0), 0),
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  } else {
    // Sort by number of prompts in each category
    return sectionsWithPrompts
      .map((section) => ({
        name: section.name,
        slugs: section.prompts.map((prompt) => prompt.slug),
      }))
      .sort((a, b) => b.slugs.length - a.slugs.length);
  }
};

export const isImageUrl = (url: string): boolean => {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

  const isDataUri = url.startsWith("data:image/");

  const isImageExtension =
    imageExtensions.includes(url.substring(url.lastIndexOf(".")).toLowerCase()) || url.endsWith(".svg");

  // Add check for GitHub avatar URLs
  const isGitHubAvatar = url.includes("avatars.githubusercontent.com");

  // Add check for URLs with 'image' in the path or query parameters
  const hasImageInUrl = url.toLowerCase().includes("image");

  return isDataUri || isImageExtension || isGitHubAvatar || hasImageInUrl;
};

export const getTimestamp = (filePath: string): number => {
  const ifExists = fs.existsSync(filePath);
  if (!ifExists) {
    return -1; // if file not exists, return -1
  } else {
    return fs.statSync(filePath).mtimeMs;
  }
};

export const processContent = (content: string) => {
  return content
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
};
