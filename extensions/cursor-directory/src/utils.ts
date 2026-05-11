import type { Author, CursorRule, Project, Section } from "./types";
import fs from "fs/promises";
import { homedir, userInfo } from "os";
import path from "path";
import { parse as parseYaml } from "yaml";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import { getPreferenceValues, showHUD, showToast, Toast, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export function getRelativeTime(timestamp: number) {
  dayjs.extend(relativeTime);
  return dayjs().to(dayjs(timestamp));
}

export function getSections(cursorRules: CursorRule[], sortByPopularity: boolean): Section[] {
  const sections = Array.from(new Set(cursorRules.flatMap((cursorRule) => cursorRule.tags)));
  const sectionsWithCursorRules = sections.map((tag) => ({
    name: tag,
    cursorRules: cursorRules.filter((cursorRule) => cursorRule.tags.includes(tag)),
  }));

  if (sortByPopularity) {
    sectionsWithCursorRules.forEach((section) => {
      section.cursorRules.sort((a, b) => (b.count || 0) - (a.count || 0));
    });

    return sectionsWithCursorRules
      .map((section) => ({
        name: section.name,
        slugs: section.cursorRules.map((cursorRule) => cursorRule.slug),
        totalCount: section.cursorRules.reduce((sum, cursorRule) => sum + (cursorRule.count || 0), 0),
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  } else {
    return sectionsWithCursorRules
      .map((section) => ({
        name: section.name,
        slugs: section.cursorRules.map((cursorRule) => cursorRule.slug),
      }))
      .sort((a, b) => b.slugs.length - a.slugs.length);
  }
}

export function isImageUrl(url: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

  const isDataUri = url.startsWith("data:image/");

  const isImageExtension =
    imageExtensions.includes(url.substring(url.lastIndexOf(".")).toLowerCase()) || url.endsWith(".svg");

  const isGitHubAvatar = url.includes("avatars.githubusercontent.com");

  const isYoutubeAvatar = url.includes("yt3.ggpht.com");

  const hasImageInUrl = url.toLowerCase().includes("image");

  return isDataUri || isImageExtension || isGitHubAvatar || hasImageInUrl || isYoutubeAvatar;
}

export async function getLastModifiedTime(path: string): Promise<number> {
  try {
    const stats = await fs.stat(path);
    return stats.mtimeMs;
  } catch {
    return -1;
  }
}

export function processContent(content: string) {
  return content
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}

export function getYoutubeVideoId(url: string): string {
  const parts = url.split("embed/");
  if (parts.length < 2) return "";

  const idPart = parts[1].split("?")[0];

  return idPart.split("/")[0];
}

export function cursorRuleToMarkdown(cursorRule: CursorRule): string {
  const username = userInfo().username;

  const frontmatter = `---
title: ${cursorRule.title}
slug: ${cursorRule.slug}.md
tags:
${cursorRule.tags.map((tag) => `  - ${tag}`).join("\n")}
libs:
${cursorRule.libs.map((lib) => `  - ${lib}`).join("\n")}
author:
  name: ${username}
  url: null
  avatar: null
count: null
---

`;

  return frontmatter + processContent(cursorRule.content);
}

export function parseMarkdownToRule(content: string, fileName: string): CursorRule | null {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) return null;

  const [, frontmatter, ruleContent] = match;

  try {
    const frontmatterData = parseYaml(frontmatter);

    const author: Author = {
      name: typeof frontmatterData.author?.name === "string" ? frontmatterData.author.name : userInfo().username,
      url: typeof frontmatterData.author?.url === "string" ? frontmatterData.author.url : "",
      avatar: typeof frontmatterData.author?.avatar === "string" ? frontmatterData.author.avatar : "",
    };

    return {
      title: typeof frontmatterData.title === "string" ? frontmatterData.title : fileName.replace(".md", ""),
      slug: typeof frontmatterData.slug === "string" ? frontmatterData.slug : fileName.replace(".md", ""),
      tags: Array.isArray(frontmatterData.tags) ? frontmatterData.tags.map(String) : [],
      libs: Array.isArray(frontmatterData.libs) ? frontmatterData.libs.map(String) : [],
      content: ruleContent.trim(),
      author,
      count: typeof frontmatterData.count === "number" ? frontmatterData.count : null,
      isLocal: true,
    };
  } catch (error) {
    console.error("Error parsing frontmatter:", error);
    return null;
  }
}

export function expandPath(path: string) {
  return path.replace(/^~/, homedir());
}

async function getCursorVersion(): Promise<number | null> {
  try {
    const script = `
      tell application "System Events"
        try
          set appVersion to version of application "Cursor"
          return appVersion
        on error
          return "0"
        end try
      end tell
    `;

    const version = await runAppleScript(script);
    const versionNumber = parseFloat(version);
    return isNaN(versionNumber) ? null : versionNumber;
  } catch (error) {
    console.error("Error getting Cursor version:", error);
    return null;
  }
}

export async function ensureCursorRulesFile(projectPath: string): Promise<void> {
  const cursorVersion = await getCursorVersion();

  if (cursorVersion && cursorVersion >= 0.45) {
    const cursorRulesDir = path.join(projectPath, ".cursor", "rules");
    try {
      await fs.mkdir(cursorRulesDir, { recursive: true });
    } catch (error) {
      console.error("Error creating cursor rules directory:", error);
      throw error;
    }
  } else {
    const cursorRulesPath = path.join(projectPath, ".cursorrules");
    try {
      await fs.access(cursorRulesPath);
    } catch {
      await fs.writeFile(cursorRulesPath, "");
    }
  }
}

export async function applyCursorRule(
  projectPath: string,
  ruleName: string,
  ruleContent: string,
  replace: boolean,
): Promise<void> {
  const cursorVersion = await getCursorVersion();

  try {
    if (cursorVersion && cursorVersion >= 0.45) {
      const cursorRulesDir = path.join(projectPath, ".cursor", "rules");
      const cursorRulesPath = path.join(cursorRulesDir, ruleName);

      if (replace) {
        await fs.writeFile(cursorRulesPath, ruleContent);
      } else {
        await fs.appendFile(cursorRulesPath, "\n" + ruleContent);
      }
    } else {
      const cursorRulesPath = path.join(projectPath, ".cursorrules");

      if (replace) {
        await fs.writeFile(cursorRulesPath, ruleContent);
      } else {
        await fs.appendFile(cursorRulesPath, "\n" + ruleContent);
      }
    }

    await showHUD("Cursor rules applied successfully");
  } catch (error) {
    console.error("Error applying cursor rule:", error);
    throw error;
  }
}

export async function openInCursor(path: string, successMessage?: string, callback?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      open(path, "Cursor");
    } catch (error) {
      console.error("Error opening with Cursor:", error);
      reject(error);
    } finally {
      if (successMessage) {
        showHUD(successMessage);
      }
      callback?.();
      resolve();
    }
  });
}

export async function loadProjects(): Promise<Project[]> {
  try {
    const { projectsDirectory } = getPreferenceValues<Preferences>();

    if (!projectsDirectory) {
      showToast({
        style: Toast.Style.Failure,
        title: "Projects directory not set",
        message: "Please set the projects directory in the extension preferences",
      });
      return [];
    }

    const expandedPath = expandPath(projectsDirectory);
    const projects = await findGitProjects(expandedPath);
    return projects.sort((a, b) => (b.lastModifiedTime ?? 0) - (a.lastModifiedTime ?? 0));
  } catch (error) {
    console.error("Error loading projects:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to load projects",
      message: String(error),
    });
    return [];
  }
}

async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(dirPath, ".git"));
    return true;
  } catch {
    return false;
  }
}

async function findGitProjects(dirPath: string, maxDepth = 3): Promise<Project[]> {
  if (maxDepth === 0) return [];

  const projects: Project[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(dirPath, entry.name);
      if (await isGitRepository(fullPath)) {
        const lastModifiedTime = await getLastModifiedTime(fullPath);
        projects.push({ name: entry.name, path: fullPath, lastModifiedTime });
      } else {
        projects.push(...(await findGitProjects(fullPath, maxDepth - 1)));
      }
    }
  }

  return projects;
}
