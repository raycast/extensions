// src/utils/createMarkdown.ts
import { showToast, Toast, open, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import path from "path";
import { homedir } from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { clearMarkdownFilesCache } from "./fileOperations";
import { showFailureToast } from "@raycast/utils";
const execPromise = promisify(exec);

// Get user preferences
interface Preferences {
  defaultEditor: string;
}

interface CreateMarkdownOptions {
  title: string;
  template?: string;
  tags?: string[];
  targetPath?: string;
}

// Define templates
const templates = {
  empty: "",
  basic: `# {{title}}

Created: {{date}}
Tags: {{tags}}

## Content

`,
  meeting: `# Meeting: {{title}}

Date: {{date}}
Participants: 
Tags: {{tags}}

## Agenda

- 

## Notes

- 

## Action Items

- [ ] 
`,
  blog: `---
title: "{{title}}"
date: "{{date}}"
tags: [{{tags}}]
draft: true
---

# {{title}}

## Introduction

`,
  project: `# Project: {{title}}

Start Date: {{date}}
Status: Planning
Tags: {{tags}}

## Overview

## Goals

- 

## Timeline

- [ ] 

## Resources

- 
`,
};

// Helper function to open file with preferred editor
async function openWithEditor(filePath: string): Promise<void> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const defaultEditor = preferences.defaultEditor || "Typora";

    // Try to open with the specified editor
    try {
      await execPromise(`open -a "${defaultEditor}" "${filePath}"`);
      return;
    } catch (editorError) {
      console.warn(`Failed to open with ${defaultEditor}:`, editorError);

      // If specified editor is Typora, try direct path as fallback
      if (defaultEditor === "Typora") {
        const typoraPath = "/Applications/Typora.app/Contents/MacOS/Typora";
        if (fs.existsSync(typoraPath)) {
          await execPromise(`"${typoraPath}" "${filePath}"`);
          return;
        }
      }

      // If all else fails, use default opener
      await open(filePath);
    }
  } catch (error) {
    console.error("Failed to open file:", error);
    // Fallback to default opener
    await open(filePath);
  }
}

// Helper function to create markdown file
async function createMarkdownFileHelper({
  title,
  template = "basic",
  tags = [],
  targetPath,
}: CreateMarkdownOptions): Promise<string> {
  try {
    // Use targetPath if provided, otherwise use Desktop as fallback
    const baseDir = targetPath || path.join(homedir(), "Desktop");

    // Create filename from title - only replace invalid characters
    const sanitizedTitle = title
      .trim()
      .replace(/[<>:"/\\|?*]/g, "-") // Replace invalid filename characters with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with a single one
      .replace(/^-|-$/g, ""); // Remove leading and trailing hyphens

    // If sanitizedTitle is empty after processing, use a default name
    const fileName = sanitizedTitle ? `${sanitizedTitle}.md` : `note-${Date.now()}.md`;
    const filePath = path.join(baseDir, fileName);

    // Check if directory exists, create if not
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "File already exists",
        message: fileName,
      });
      return "";
    }

    // Get template content
    let content = templates[template as keyof typeof templates] || templates.basic;

    // Format tags - ensure they have # prefix if they don't already
    const formattedTags = tags.map((tag) => {
      const trimmedTag = tag.trim();
      return trimmedTag.startsWith("#") ? trimmedTag : `#${trimmedTag}`;
    });

    // Replace placeholders
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    content = content
      .replace(/{{title}}/g, title)
      .replace(/{{date}}/g, formattedDate)
      .replace(/{{tags}}/g, formattedTags && formattedTags.length > 0 ? formattedTags.join(", ") : "");

    // Write file
    await fs.promises.writeFile(filePath, content);

    // Clear the cache to ensure fresh data on next fetch
    await clearMarkdownFilesCache();

    // Show success toast with path information
    await showToast({
      style: Toast.Style.Success,
      title: "Markdown file created",
      message: `${fileName} in ${path.basename(baseDir)}`,
    });

    // Open the file with preferred editor
    await openWithEditor(filePath);

    return filePath;
  } catch (error) {
    console.error("Error creating Markdown file:", error);
    showFailureToast({
      title: "Failed to create Markdown file",
      message: String(error),
    });
    return "";
  }
}

// Default export function for Raycast tool
export default async function createMarkdown(options: CreateMarkdownOptions): Promise<{ filePath: string }> {
  const filePath = await createMarkdownFileHelper(options);
  return { filePath };
}
