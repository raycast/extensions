import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { parse } from "yaml";
import SnippetContent from "../../components/SnippetContent";
import { Snippet } from "../../types";

function extractMetadataContent(
  relativePath: string,
  fileContent: string
): { content: SnippetContent; error: Error | null } {
  const lines = fileContent.split("\n");

  let metadataEndIndex = 0;
  let contentStartIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "---" && i != 0) {
      metadataEndIndex = i;
      contentStartIndex = i + 1;
      break;
    }
  }

  // Replaces all tab characters with four spaces, otherwise the `parse(rawMetadata)` will throw an error
  const rawMetadata = lines.slice(1, metadataEndIndex).join("\n").replace(/\t/g, "    ");
  const content = lines.slice(contentStartIndex).join("\n").trim();

  let metadata;
  let tags: string[] = [];
  let error = null;
  try {
    metadata = parse(rawMetadata);

    // Parse tags (case-insensitive)
    const tagsKey = getCaseInsensitiveKey(metadata, "tags") || "Tags";
    const rawTags = metadata?.[tagsKey] ?? [];
    if (!Array.isArray(rawTags) || rawTags.some((tag) => typeof tag !== "string")) {
      tags = [];
      error = new Error(`Invalid tags. All tags must be a string for ${relativePath}`);
    } else {
      tags = rawTags;
    }
  } catch (e) {
    error = new Error(`Error parsing metadata for ${relativePath}`);
  }

  const titleKey = getCaseInsensitiveKey(metadata, "title") || "Title";
  const descriptionKey = getCaseInsensitiveKey(metadata, "description") || "Description";
  const snippetContent: SnippetContent = {
    title: metadata?.[titleKey],
    description: metadata?.[descriptionKey],
    tags: tags,
    content: content,
    rawMetadata: rawMetadata,
  };
  return { content: snippetContent, error: error };
}

async function readFileContent(
  relativePath: string,
  fullPath: string
): Promise<{ content: SnippetContent; error: Error | null }> {
  const fileContent = await fs.promises.readFile(fullPath, "utf8");
  return extractMetadataContent(relativePath, fileContent);
}

async function loadMarkdown(
  relativePath: string,
  fullPath: string
): Promise<{ snippet: Snippet; error: Error | null }> {
  const parsedName = path.parse(fullPath).name;

  const hash = crypto.createHash("md5");
  hash.update(fullPath);
  const id = hash.digest("hex");

  const { content, error } = await readFileContent(relativePath, fullPath);
  const snippet: Snippet = {
    id: id,
    folder: path.dirname(relativePath),
    name: content.title ?? parsedName,
    content: content,
  };
  return { snippet: snippet, error: error };
}

function getCaseInsensitiveKey(metadata: any, key: string): string | undefined {
  if (!metadata) {
    return undefined;
  }
  return Object.keys(metadata).find((k) => k.toLowerCase() === key.toLowerCase());
}

export default loadMarkdown;
