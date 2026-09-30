// src/utils/tagOperations.ts
import fs from "fs";
import { SYSTEM_TAGS, SystemTag } from "../types/markdownTypes";
import { showFailureToast } from "@raycast/utils";

// Helper function to normalize tags (e.g., lowercase, trim extra spaces)
const normalizeTag = (tag: string): string => {
  return tag.trim().toLowerCase();
};

// Check if it is a color code label (3 or 6 digit hexadecimal color code)
export const isColorTag = (tag: string): boolean => {
  return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(tag);
};

// Check if tag consists only of numbers
export const isNumericTag = (tag: string): boolean => {
  return /^\d+$/.test(tag);
};

// Check if a tag is a system tag
export const isSystemTag = (tag: string): boolean => {
  const normalizedTag = normalizeTag(tag);
  return SYSTEM_TAGS.some((systemTag) => normalizedTag === systemTag.id.toLowerCase());
};

// Get system tag by tag name
export const getSystemTag = (tag: string): SystemTag | undefined => {
  const normalizedTag = normalizeTag(tag);
  return SYSTEM_TAGS.find((systemTag) => normalizedTag === systemTag.id.toLowerCase());
};

// Function to extract tags from the file
export const extractTags = (filePath: string): string[] => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const tags: string[] = [];

    const inlineTagsMatch = content.match(
      // eslint-disable-next-line no-useless-escape
      /(?<!\[[^\]]*)\#([a-zA-Z0-9_\u4e00-\u9fa5](?:-?[a-zA-Z0-9_\u4e00-\u9fa5])*)\b(?![^\[]*\])/g,
    );
    if (inlineTagsMatch) {
      console.log(`Raw inline tags for ${filePath}:`, inlineTagsMatch); // Log raw inline tags
      const filteredTags = inlineTagsMatch
        .map((t) => t.substring(1).trim()) // Remove "#" and trim whitespace
        .filter((tag) => tag && tag.length > 0 && !isColorTag(tag) && !isNumericTag(tag)); // Exclude blank, color, and numeric tags
      console.log(`Filtered inline tags for ${filePath}:`, filteredTags); // Log filtered inline tags
      tags.push(...filteredTags);
    } else {
      console.log(`No inline tags found for ${filePath}`);
    }

    // Extract tags from YAML frontmatter
    const frontmatterMatch = content.match(/^\s*---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]|tags:\s*(.+)/);
      if (tagsMatch) {
        const tagList = tagsMatch[1] || tagsMatch[2];
        console.log(`Raw YAML tags for ${filePath}:`, tagList); // Log raw YAML tags
        const frontmatterTags = tagList
          .split(/,\s*/) // Split by comma and optional whitespace
          .map((t) => t.trim().replace(/['"]/g, "")) // Trim and remove quotes
          .filter((tag) => tag && tag.length > 0) // Filter out blank tags immediately
          .filter((tag) => !isNumericTag(tag) && !isColorTag(tag)); // Exclude numeric and color tags
        console.log(`Filtered YAML tags for ${filePath}:`, frontmatterTags); // Log filtered YAML tags
        tags.push(...frontmatterTags);
      } else {
        console.log(`No YAML tags found in frontmatter for ${filePath}`);
      }
    } else {
      console.log(`No frontmatter found for ${filePath}`);
    }

    // Normalize tags, remove duplicates, and ensure no blank tags remain
    const normalizedTags = tags.map(normalizeTag);
    const finalTags = Array.from(new Set(normalizedTags.filter((tag) => tag && tag.length > 0)));
    console.log(`Final tags for ${filePath}:`, finalTags); // Log the final tags
    return finalTags;
  } catch (error) {
    showFailureToast({
      title: `Error extracting tags from ${filePath}`,
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

// Sort tags with system tags first
export const sortTags = (tags: string[]): string[] => {
  return [...tags].sort((a, b) => {
    const aIsSystem = isSystemTag(a);
    const bIsSystem = isSystemTag(b);

    if (aIsSystem && !bIsSystem) return -1;
    if (!aIsSystem && bIsSystem) return 1;
    return a.localeCompare(b, "en-US");
  });
};

// Helper function to centralize tag filtering logic
export const shouldDisplayTag = (tag: string, showColorTags: boolean = false): boolean => {
  // Filter out color tags conditionally and numeric tags always
  return (showColorTags || !isColorTag(tag)) && !isNumericTag(tag);
};

// Get all unique tags
export const getAllUniqueTags = (files: { tags: string[] }[], showColorTags: boolean = false): string[] => {
  const allTags = new Set<string>();
  files.forEach((file) => {
    file.tags.forEach((tag) => {
      // Use the centralized helper function for consistent filtering
      if (shouldDisplayTag(tag, showColorTags)) {
        allTags.add(tag);
      }
    });
  });
  const uniqueTags = Array.from(allTags).sort((a, b) => a.localeCompare(b, "en-US"));
  console.log("All unique tags:", uniqueTags); // Log unique tags
  return uniqueTags;
};

// Filter the displayed tags
export const filterDisplayTags = (tags: string[], showColorTags: boolean = false): string[] => {
  // Use the centralized helper function for consistent filtering
  const filtered = tags
    .filter((tag) => tag && typeof tag === "string" && tag.length > 0) // Ensure no falsy or blank tags
    .filter((tag) => shouldDisplayTag(tag, showColorTags));
  console.log("Filtered display tags:", filtered); // Log filtered display tags
  return filtered;
};
