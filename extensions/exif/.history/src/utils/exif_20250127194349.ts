import * as ExifReader from "exifreader";
import type { Tags } from "exifreader";
import fs from "node:fs/promises";

import { showActionToast, showFailureToast } from "./toast";

const handleError = (error: unknown) => {
  console.error(error);

  if (error instanceof Error) {
    showFailureToast("Failed to load EXIF data", error);
  }
};

// Type guard to check if a value is a tag-like object
const isTagLikeObject = (value: unknown): value is { value: unknown; description: string } => {
  return (
    typeof value === 'object' && 
    value !== null && 
    'value' in value && 
    'description' in value
  );
};

// Type guard to check if a value is an object
const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

// Recursive function to convert tags with strict typing
const convertTag = <T>(value: T): T => {
  // Handle null and undefined
  if (value === null || value === undefined) return value;
  
  // Handle arrays
  if (Array.isArray(value)) {
    return { 
      value, 
      description: value.map(v => 
        isTagLikeObject(v) ? v.description : String(v)
      ).join(", ") 
    };
  }
  
  // Handle tag-like objects
  if (isTagLikeObject(value)) {
    return value;
  }
  
  // Handle nested objects
  if (isObject(value)) {
    const convertedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      convertedObj[k] = convertTag(v);
    }
    return { 
      value: convertedObj, 
      description: JSON.stringify(convertedObj) 
    };
  }
  
  // For primitive values, wrap in an object with value and description
  return { 
    value, 
    description: String(value) 
  };
};

const decodeUnicodeComment = (value: unknown): string => {
  // Only handle arrays of numbers
  if (!Array.isArray(value) || !value.every(v => typeof v === 'number')) {
    return String(value);
  }
  
  // Check if it starts with "UNICODE\0"
  const header = [85, 78, 73, 67, 79, 68, 69, 0];
  if (value.length > header.length && header.every((byte, i) => value[i] === byte)) {
    // Skip the header and get the text bytes
    const textBytes = value.slice(header.length);
    
    // Convert pairs of bytes to characters
    let result = '';
    for (let i = 0; i < textBytes.length; i += 2) {
      // Combine two bytes into a single UTF-16 code unit (big-endian)
      const codeUnit = (textBytes[i] << 8) | textBytes[i + 1];
      result += String.fromCharCode(codeUnit);
    }
    return result;
  }
  return String(value);
};

const escapeMarkdown = (text: string): string => {
  // Escape pipes and newlines for markdown table cells
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
};

export const tagsToMarkdownTable = (tags: Tags): string => {
  const table = Object.entries(tags)
    // Filter out image tags because it's shown as an image
    .filter(([key]) => !["Thumbnail", "Images"].includes(key))
    .sort(([key1], [key2]) => key1.localeCompare(key2))
    .map(([key, value]) => {
      if (value === undefined) {
        return `| ${escapeMarkdown(key)} | \`undefined\` | \`undefined\` |`;
      }
      // Omit ApplicationNotes and MakerNote because they're too long
      if (["ApplicationNotes", "MakerNote"].includes(key)) {
        return `| ${escapeMarkdown(key)} | _... omitted (see JSON export) ..._ | \`...\` |`;
      } else if (key === "UserComment" && typeof value === 'object' && value !== null && 'value' in value) {
        const decodedText = decodeUnicodeComment(value.value);
        return `| ${escapeMarkdown(key)} | ${escapeMarkdown(decodedText)} | \`${JSON.stringify(value.value)}\` |`;
      } else if (value instanceof Array) {
        return `| ${escapeMarkdown(key)} | ${escapeMarkdown(value.map((v) => v.description).join(", "))} | \`${JSON.stringify(
          value.map((v) => v.value),
        )}\` |`;
      } else if (value instanceof Date) {
        return `| ${escapeMarkdown(key)} | ${escapeMarkdown(value.toISOString())} | \`${JSON.stringify(value)}\` |`;
      } else {
        return `| ${escapeMarkdown(key)} | ${escapeMarkdown(value.description)} | \`${JSON.stringify(value.value)}\` |`;
      }
    })
    .join("\n");

  return `| **Tag** | **Value** | **Raw Value** |\n|---|---|---|\n${table}`;
};

export const exifFromFile = async (file: string): Promise<Tags | null> => {
  const toast = await showActionToast({
    title: "Loading EXIF data...",
    cancelable: false,
  });
  try {
    const filePath = decodeURIComponent(file).replace("file://", "");
    const buff = await fs.readFile(filePath);
    // Convert Buffer to Uint8Array and create DataView
    const uint8Array = new Uint8Array(buff);
    const dataView = new DataView(
      uint8Array.buffer,
      uint8Array.byteOffset,
      uint8Array.byteLength
    );
    const tags = await ExifReader.loadView(dataView, { 
      includeUnknown: true,
      async: true
    });

    // Convert all tags recursively
    const convertedTags: Tags = Object.fromEntries(
      Object.entries(tags).map(([key, value]) => [key, convertTag(value)])
    ) as Tags;

    toast.hide();
    return convertedTags;
  } catch (error) {
    toast.hide();
    handleError(error);
    return null;
  }
};

export const exifFromUrl = async (url: string): Promise<Tags | null> => {
  try {
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw new Error("Invalid URL protocol");
    }
    const controller = await showActionToast({
      title: "Loading EXIF data...",
      cancelable: true,
    });
    const buff = await fetch(urlObj, { signal: controller.signal }).then((res) => res.arrayBuffer());
    // Convert ArrayBuffer to DataView
    const uint8Array = new Uint8Array(buff);
    const dataView = new DataView(
      uint8Array.buffer,
      uint8Array.byteOffset,
      uint8Array.byteLength
    );
    const tags = await ExifReader.loadView(dataView, { 
      includeUnknown: true,
      async: true
    });

    // Convert all tags recursively
    const convertedTags: Tags = Object.fromEntries(
      Object.entries(tags).map(([key, value]) => [key, convertTag(value)])
    ) as Tags;

    return convertedTags;
  } catch (error) {
    handleError(error);
    return null;
  }
};
