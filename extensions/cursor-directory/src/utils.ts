import type { Author, CursorRule, Section } from "./types";
import fs from "fs/promises";
import os, { homedir } from "os";
import path from "path";
import { parse as parseYaml } from "yaml";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";

export const getRelativeTime = (timestamp: number) => {
  dayjs.extend(relativeTime);
  return dayjs().to(dayjs(timestamp));
};

export const getSections = (cursorRules: CursorRule[], sortByPopularity: boolean): Section[] => {
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
};

export const isImageUrl = (url: string): boolean => {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

  const isDataUri = url.startsWith("data:image/");

  const isImageExtension =
    imageExtensions.includes(url.substring(url.lastIndexOf(".")).toLowerCase()) || url.endsWith(".svg");

  const isGitHubAvatar = url.includes("avatars.githubusercontent.com");

  const isYoutubeAvatar = url.includes("yt3.ggpht.com");

  const hasImageInUrl = url.toLowerCase().includes("image");

  return isDataUri || isImageExtension || isGitHubAvatar || hasImageInUrl || isYoutubeAvatar;
};

export const getFileTimestamp = async (filePath: string): Promise<number> => {
  try {
    await fs.access(filePath);
    return (await fs.stat(filePath)).mtimeMs;
  } catch {
    return -1;
  }
};

export const processContent = (content: string) => {
  return content
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
};

export function getYoutubeVideoId(url: string): string {
  const parts = url.split("embed/");
  if (parts.length < 2) return "";

  const idPart = parts[1].split("?")[0];

  return idPart.split("/")[0];
}

export function cursorRuleToMarkdown(cursorRule: CursorRule): string {
  const username = os.userInfo().username;

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
      name: typeof frontmatterData.author?.name === "string" ? frontmatterData.author.name : os.userInfo().username,
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

export const expandPath = (path: string) => {
  return path.replace(/^~/, homedir());
};

export const isGitRepository = async (dirPath: string): Promise<boolean> => {
  try {
    await fs.access(path.join(dirPath, ".git"));
    return true;
  } catch {
    return false;
  }
};
