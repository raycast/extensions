import { promises as fs } from "fs";
import * as path from "path";
import { glob } from "glob";
import matter from "gray-matter";
import { NoteWithUrl } from "../types";
import { LocalStorage } from "@raycast/api";

export async function scanVaultForUrls(): Promise<NoteWithUrl[]> {
  // Get vault path from LocalStorage
  const vaultPath = await LocalStorage.getItem<string>("selectedVaultPath");

  if (!vaultPath) {
    throw new Error("No vault selected. Please run 'Select Vault' command.");
  }

  // Find all markdown files
  const pattern = "**/*.md";
  const files = await glob(pattern, {
    cwd: vaultPath,
    ignore: ["**/node_modules/**", "**/.obsidian/**", "**/.trash/**"],
    absolute: true,
  });

  const notesWithUrls: NoteWithUrl[] = [];

  // Process each file
  await Promise.all(
    files.map(async (filePath) => {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const { data: frontmatter } = matter(content);

        if (!frontmatter || typeof frontmatter !== "object") {
          return;
        }

        // Get file stats for actual modification time
        const stats = await fs.stat(filePath);

        // Check all properties for valid URLs
        for (const [property, value] of Object.entries(frontmatter)) {
          // Skip non-string values
          if (typeof value !== "string") {
            continue;
          }

          // Check if the value is a valid URL
          if (isValidUrl(value)) {
            const relativePath = path.relative(vaultPath, filePath);
            const title =
              frontmatter.title ||
              frontmatter.name ||
              path.basename(filePath, ".md");

            notesWithUrls.push({
              id: `${filePath}-${property}`,
              title,
              path: relativePath,
              vault: vaultPath,
              frontmatter,
              lastModified: stats.mtime,
              url: value,
              urlSource: property,
            });
          }
        }
      } catch (error) {
        // Silently skip files that can't be read
      }
    })
  );

  return notesWithUrls;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
