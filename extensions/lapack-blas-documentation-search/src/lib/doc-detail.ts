import { environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";
import type { InventoryItem } from "./inventory";

export interface DocDetail {
  markdown: string;
}

/**
 * Load markdown documentation from the bundled docs folder.
 * This function reads the markdown file content that was bundled with the extension.
 *
 * @param item The inventory item to load documentation for
 * @returns Promise that resolves to the documentation detail
 */
export async function loadDocDetail(item: InventoryItem): Promise<DocDetail> {
  try {
    // Construct the path to the markdown file
    // Use Raycast's environment.assetsPath to get the correct path to bundled assets
    const docsPath = join(environment.assetsPath, "docs", item.docPath);

    // Read the markdown file synchronously
    const markdown = readFileSync(docsPath, "utf-8");

    return { markdown };
  } catch (error) {
    console.error(`Failed to load documentation for ${item.name}:`, error);

    // Return a fallback message if the file couldn't be loaded
    return {
      markdown: `# ${item.name}\n\n${item.description}\n\n## Documentation Not Available\n\nThe documentation file for this routine could not be loaded.`,
    };
  }
}

/**
 * Build the complete markdown for display.
 * @param item The inventory item
 * @param detail The documentation detail
 * @returns Complete markdown string
 */
export function buildMarkdown(item: InventoryItem, detail: DocDetail): string {
  const lines: string[] = [];

  // Add the markdown content
  lines.push(detail.markdown);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`**Category**: ${item.category}`);
  lines.push("");
  lines.push(`**Official Documentation**: [${item.name}](${item.url})`);

  return lines.join("\n").trim();
}
