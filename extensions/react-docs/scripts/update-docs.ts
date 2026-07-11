#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { BASE_URL, DocEntry, cleanTitle, deduplicateAndAssignIds, sortEntries, getTypeBreakdown } from "./utils.js";

const RAW_BASE = "https://raw.githubusercontent.com/reactjs/react.dev/main/src";

const SIDEBAR_SOURCES = [
  { file: "sidebarReference.json", category: "reference" },
  { file: "sidebarLearn.json", category: "learn" },
  { file: "sidebarBlog.json", category: "blog" },
  { file: "sidebarCommunity.json", category: "community" },
] as const;

interface SidebarItem {
  title?: string;
  path?: string;
  routes?: SidebarItem[];
  heading?: boolean;
  hasSectionHeader?: boolean;
  sectionHeader?: string;
}

interface SidebarResponse {
  routes?: SidebarItem[];
}

/**
 * Determines the doc type based on path and source category
 */
function categorizeEntry(urlPath: string, title: string, sourceCategory: string): string {
  // Reference-specific categorization
  if (sourceCategory === "reference") {
    if (urlPath.includes("/react-dom/server")) return "server APIs";
    if (urlPath.includes("/react-dom/client")) return "DOM APIs";
    if (urlPath.includes("/react-dom/hooks")) return "hooks";
    if (urlPath.includes("/react-dom/components")) return "DOM components";
    if (urlPath.includes("/react-dom/")) return "DOM APIs";
    if (title.startsWith("use")) return "hooks";
    if (["Fragment", "Profiler", "StrictMode", "Suspense", "Activity", "ViewTransition"].includes(title)) {
      return "components";
    }
    return "APIs";
  }

  // Other categories map directly
  return sourceCategory;
}

/**
 * Recursively extracts doc entries from the sidebar structure
 */
function extractFromSidebar(items: SidebarItem[], sourceCategory: string): DocEntry[] {
  const entries: DocEntry[] = [];

  for (const item of items) {
    if (item.path && item.title && !item.heading) {
      const url = `${BASE_URL}${item.path}`;
      const title = cleanTitle(item.title);
      const type = categorizeEntry(item.path, title, sourceCategory);

      entries.push({
        id: "",
        type,
        title,
        url,
      });
    }

    if (item.routes) {
      entries.push(...extractFromSidebar(item.routes, sourceCategory));
    }
  }

  return entries;
}

/**
 * Fetches a sidebar JSON file from GitHub
 */
async function fetchSidebarJson(filename: string): Promise<SidebarItem[]> {
  const url = `${RAW_BASE}/${filename}`;
  console.log(`Fetching ${filename}...`);

  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`⚠️  Failed to fetch ${filename}: ${response.statusText}`);
    return [];
  }

  const data = (await response.json()) as SidebarResponse;
  return data.routes || [];
}

/**
 * Fetches all sidebar sources and combines entries
 */
async function fetchAllDocs(): Promise<DocEntry[]> {
  const allEntries: DocEntry[] = [];

  const results = await Promise.all(
    SIDEBAR_SOURCES.map(async ({ file, category }) => {
      const sidebar = await fetchSidebarJson(file);
      const entries = extractFromSidebar(sidebar, category);
      console.log(`  → ${entries.length} entries from ${category}`);
      return entries;
    }),
  );

  for (const entries of results) {
    allEntries.push(...entries);
  }

  console.log(`\nTotal entries collected: ${allEntries.length}`);

  const uniqueEntries = deduplicateAndAssignIds(allEntries);
  console.log(`Final unique entries: ${uniqueEntries.length}`);

  return uniqueEntries;
}

/**
 * Generates TypeScript file content from documentation entries
 */
function generateTypeScriptFile(entries: DocEntry[]): string {
  const sortedEntries = sortEntries(entries);

  // Re-assign IDs after sorting
  sortedEntries.forEach((entry, index) => {
    entry.id = String(index + 1);
  });

  let content = "export const REACT_DOCS = [\n";
  let currentType = "";

  for (const entry of sortedEntries) {
    // Add comment for new type sections
    if (entry.type !== currentType) {
      if (currentType !== "") {
        content += "\n";
      }
      currentType = entry.type;
      const typeLabel = entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
      content += `  // React ${typeLabel}\n`;
    }

    content += `  {\n`;
    content += `    id: "${entry.id}",\n`;
    content += `    type: "${entry.type}",\n`;
    content += `    title: "${entry.title}",\n`;
    content += `    url: "${entry.url}",\n`;
    content += `  },\n`;
  }

  content += "] as const;\n\n";
  content += "export type ReactDocEntry = (typeof REACT_DOCS)[number];\n";
  content += "export type DocType = ReactDocEntry['type'];\n";

  return content;
}

/**
 * Displays a summary of the documentation update
 */
function displaySummary(entries: DocEntry[], outputPath: string): void {
  console.log(`\n✅ Successfully updated ${outputPath}`);
  console.log(`📝 Generated ${entries.length} documentation entries`);

  const typeBreakdown = getTypeBreakdown(entries);

  console.log("\nBreakdown by type:");
  Object.entries(typeBreakdown)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.log("Starting React documentation update...\n");

    const entries = await fetchAllDocs();

    const tsContent = generateTypeScriptFile(entries);
    const outputPath = path.join(process.cwd(), "src", "data", "index.ts");

    fs.writeFileSync(outputPath, tsContent, "utf-8");

    displaySummary(entries, outputPath);
  } catch (error) {
    console.error("❌ Error updating documentation:", error);
    process.exit(1);
  }
}

main();
