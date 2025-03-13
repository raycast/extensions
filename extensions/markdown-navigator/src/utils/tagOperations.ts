// src/utils/tagOperations.ts
import fs from "fs";
import { SYSTEM_TAGS, SystemTag } from "../types/markdownTypes";
import { showFailureToast } from "@raycast/utils";
// Check if it is a color code label
export const isColorTag = (tag: string): boolean => {
  // Check if it is a 3 or 6 digit hexadecimal color code
  return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(tag);
};

// Check if tag consists only of numbers
export const isNumericTag = (tag: string): boolean => {
  return /^\d+$/.test(tag);
};

// Check if a tag is a system tag
export const isSystemTag = (tag: string): boolean => {
  return SYSTEM_TAGS.some((systemTag) => tag.toLowerCase() === systemTag.id.toLowerCase());
};

// Get system tag by tag name
export const getSystemTag = (tag: string): SystemTag | undefined => {
  return SYSTEM_TAGS.find((systemTag) => tag.toLowerCase() === systemTag.id.toLowerCase());
};

// Function to extract tags from the file
export const extractTags = (filePath: string): string[] => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const tags: string[] = [];

    // Find inline tags #tag
    const inlineTagsMatch = content.match(/#([a-zA-Z0-9_\u4e00-\u9fa5](?:-?[a-zA-Z0-9_\u4e00-\u9fa5])*)/g);
    if (inlineTagsMatch) {
      const filteredTags = inlineTagsMatch
        .map((t) => t.substring(1))
        .filter((tag) => !isColorTag(tag) && !isNumericTag(tag)); // Filter out color code tags and numeric tags

      tags.push(...filteredTags);
    }

    // Find the tag in the YAML frontmatter
    const frontmatterMatch = content.match(/^\s*---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]|tags:\s*(.+)/);
      if (tagsMatch) {
        const tagList = tagsMatch[1] || tagsMatch[2];
        const frontmatterTags = tagList
          .split(/,\s*/)
          .map((t) => t.trim().replace(/['"]/g, ""))
          .filter((tag) => Boolean(tag) && !isNumericTag(tag));
        tags.push(...frontmatterTags);
      }
    }

    // Remove duplicates and return
    return Array.from(new Set(tags.filter(Boolean)));
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

// Get all unique tags
export const getAllUniqueTags = (files: { tags: string[] }[], showColorTags: boolean = false): string[] => {
  const allTags = new Set<string>();
  files.forEach((file) => {
    file.tags.forEach((tag) => {
      // Filter out color tags and numeric tags
      if ((showColorTags || !isColorTag(tag)) && !isNumericTag(tag)) {
        allTags.add(tag);
      }
    });
  });
  return Array.from(allTags).sort((a, b) => a.localeCompare(b, "en-US"));
};

// Filter the displayed tags
export const filterDisplayTags = (tags: string[], showColorTags: boolean = false): string[] => {
  return tags.filter((tag) => (showColorTags || !isColorTag(tag)) && !isNumericTag(tag));
};
