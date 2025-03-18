import * as ExifReader from "exifreader";
import type { Tags } from "exifreader";
import fs from "node:fs/promises";
import fetch from "node-fetch";

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
    return value.map(convertTag) as T;
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
    return convertedObj as T;
  }
  
  // For primitive values, wrap in an object with value and description
  return { 
    value, 
    description: String(value) 
  } as T;
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

const escapeMarkdown = (text: unknown): string => {
  // Convert to string and escape pipes and newlines for markdown table cells
  const str = typeof text === 'string' ? text : String(text);
  return str.replace(/\|/g, '\\|').replace(/\n/g, ' ');
};

export const tagsToMarkdownTable = (tags: Tags): string => {
  const table = Object.entries(tags)
    // Filter out image tags because it's shown as an image
    .filter(([key]) => !["Thumbnail", "Images"].includes(key))
    .sort(([key1], [key2]) => key1.localeCompare(key2))
    .map(([key, value]) => {
      if (!value) {
        return `| ${escapeMarkdown(key)} | \`undefined\` | \`undefined\` |`;
      }
      // Omit ApplicationNotes and MakerNote because they're too long
      if (["ApplicationNotes", "MakerNote"].includes(key)) {
        return `| ${escapeMarkdown(key)} | _... omitted (see JSON export) ..._ | \`...\` |`;
      } 
      
      // Handle different value types
      if (key === "UserComment" && typeof value === 'object' && 'value' in value) {
        const decodedText = decodeUnicodeComment(value.value);
        return `| ${escapeMarkdown(key)} | ${escapeMarkdown(decodedText)} | \`${JSON.stringify(value.value)}\` |`;
      } 
      
      if (value instanceof Array) {
        const descriptions = value.map(v => {
          if (typeof v === 'object' && v !== null && 'description' in v) return v.description;
          return String(v);
        }).join(", ");
        const values = value.map(v => {
          if (typeof v === 'object' && v !== null && 'value' in v) return v.value;
          return v;
        });
        return `| ${escapeMarkdown(key)} | ${escapeMarkdown(descriptions)} | \`${JSON.stringify(values)}\` |`;
      } 
      
      if (value instanceof Date) {
        return `| ${escapeMarkdown(key)} | ${escapeMarkdown(value.toISOString())} | \`${JSON.stringify(value)}\` |`;
      } 
      
      if (typeof value === 'object' && value !== null) {
        const description = 'description' in value ? value.description : JSON.stringify(value);
        const rawValue = 'value' in value ? value.value : value;
        return `| ${escapeMarkdown(key)} | ${escapeMarkdown(description)} | \`${JSON.stringify(rawValue)}\` |`;
      }
      
      // Handle primitive values
      return `| ${escapeMarkdown(key)} | ${escapeMarkdown(String(value))} | \`${JSON.stringify(value)}\` |`;
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
    const rawTags = await ExifReader.loadView(dataView, { 
      includeUnknown: true,
      async: true
    });

    // Filter and convert tags
    const tags = Object.fromEntries(
      Object.entries(rawTags)
        .filter(([key, value]) => value !== null && value !== undefined && key !== 'about')
    );

    // Convert filtered tags
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
      includeUnknown: false,
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
