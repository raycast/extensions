import { environment } from "@raycast/api";
import { readFileSync } from "fs";
import { join } from "path";
import type { InventoryItem } from "./inventory";

export interface DocDetail {
  markdown: string;
  signature?: string;
}

/**
 * Extract signature without type annotations from markdown.
 * Parses the fortran code block and extracts just the routine name and parameters.
 *
 * @param markdown The markdown content
 * @returns The signature without types, or undefined if not found
 */
function extractSignature(markdown: string): string | undefined {
  // Match the fortran code block with the signature
  // This handles both:
  // - subroutine name (params)
  // - function name (params) OR type function name (params)
  const signatureMatch = markdown.match(
    /```fortran\n(?:(?:\w+\s+)+)?(subroutine|function)\s+(\w+)\s*\(\s*([\s\S]*?)\s*\)\s*\n```/i,
  );

  if (!signatureMatch) {
    return undefined;
  }

  const routineName = signatureMatch[2].toLowerCase();
  const paramsBlock = signatureMatch[3];

  // Extract parameter names (without types)
  // Each parameter is on its own line with format: "type name," or just "name,"
  const paramNames: string[] = [];
  const lines = paramsBlock.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Remove trailing comma
    const withoutComma = trimmed.replace(/,$/, "");

    // Split by spaces and take the last part (the parameter name)
    const parts = withoutComma.split(/\s+/);
    const paramName = parts[parts.length - 1];

    if (paramName) {
      paramNames.push(paramName);
    }
  }

  // Build signature: routineName(param1, param2, ...)
  return `${routineName}(${paramNames.join(", ")})`;
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

    // Extract signature without types
    const signature = extractSignature(markdown);

    return { markdown, signature };
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
