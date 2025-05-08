#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";

const ENTRIES_PATH = "src/registries/builtin/entries.ts";
const README_PATH = "README.md";

function extractEntries(tsContent: string, arrayName: string) {
  const arrayRegex = new RegExp(`export const ${arrayName}: RegistryEntry\\[] = \\[(.*?)\\n\\];`, "gs");
  const match = arrayRegex.exec(tsContent);
  if (!match) return [];
  const arrayContent = match[1];

  // This regex assumes title, description, homepage are all present and single-line
  const entryRegex = /title:\s*["'`](.*?)["'`],\s*description:\s*["'`](.*?)["'`],\s*.*?homepage:\s*["'`](.*?)["'`],/gs;
  const entries: any[] = [];
  let entryMatch;
  while ((entryMatch = entryRegex.exec(arrayContent))) {
    entries.push({
      title: entryMatch[1].trim(),
      description: entryMatch[2].trim(),
      homepage: entryMatch[3].trim(),
    });
  }
  return entries;
}

function generateMarkdownTable(entries: any[], heading: string) {
  let md = `\n### ${heading}\n\n`;
  md += "| Title | Description |\n";
  md += "|-------|-------------|\n";
  for (const entry of entries) {
    md += `| [${entry.title}](${entry.homepage}) | ${entry.description} |\n`;
  }
  return md;
}

function updateReadme(readmeContent: string, newSection: string) {
  const start = "<!-- MCP_SERVERS_START -->";
  const end = "<!-- MCP_SERVERS_END -->";
  const regex = new RegExp(`${start}[\s\S]*?${end}`, "m");
  const matches = [...readmeContent.matchAll(new RegExp(`${start}[\s\S]*?${end}`, "g"))];
  if (matches.length > 1) {
    console.warn("Warning: Multiple MCP_SERVERS marker pairs found. Only the first will be replaced.");
  }
  if (regex.test(readmeContent)) {
    return readmeContent.replace(regex, `${start}\n${newSection}\n${end}`);
  } else {
    // Insert at the end if not found
    return readmeContent + `\n${start}\n${newSection}\n${end}\n`;
  }
}

const tsContent = readFileSync(ENTRIES_PATH, "utf8");
const official = extractEntries(tsContent, "OFFICIAL_ENTRIES");
const community = extractEntries(tsContent, "COMMUNITY_ENTRIES");

let section = "";
section += generateMarkdownTable(official, "Official MCP Servers");
section += generateMarkdownTable(community, "Community MCP Servers");

const readmeContent = readFileSync(README_PATH, "utf8");
const updatedReadme = updateReadme(readmeContent, section);
writeFileSync(README_PATH, updatedReadme);

console.log("README.md updated with MCP server info!");
