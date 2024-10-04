import type { Author, CursorRule, Section } from "./types";
import fs from "fs";
import os from "os";
import { parse as parseYaml } from "yaml";

export const getSections = (cursorRules: CursorRule[], sortByPopularity: boolean): Section[] => {
  const sections = Array.from(new Set(cursorRules.flatMap((cursorRule) => cursorRule.tags)));
  const sectionsWithCursorRules = sections.map((tag) => ({
    name: tag,
    cursorRules: cursorRules.filter((cursorRule) => cursorRule.tags.includes(tag)),
  }));

  if (sortByPopularity) {
    // Sort cursor rules within each section by count
    sectionsWithCursorRules.forEach((section) => {
      section.cursorRules.sort((a, b) => (b.count || 0) - (a.count || 0));
    });
    // Sort sections by total count
    return sectionsWithCursorRules
      .map((section) => ({
        name: section.name,
        slugs: section.cursorRules.map((cursorRule) => cursorRule.slug),
        totalCount: section.cursorRules.reduce((sum, cursorRule) => sum + (cursorRule.count || 0), 0),
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  } else {
    // Sort by number of cursor rules in each category
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

    console.debug(frontmatterData);

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
