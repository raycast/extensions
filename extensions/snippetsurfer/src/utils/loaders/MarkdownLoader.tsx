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

  const rawMetadata = lines.slice(1, metadataEndIndex).join("\n");
  const content = lines.slice(contentStartIndex).join("\n").trim();

  let metadata;
  let tags: string[] = [];
  let error = null;
  try {
    metadata = parse(rawMetadata);

    // Parse tags
    const rawTags = metadata?.["Tags"] ?? [];
    if (!Array.isArray(rawTags) || rawTags.some((tag) => typeof tag !== "string")) {
      tags = [];
      error = new Error(`Invalid tags. All tags must be a string for ${relativePath}`);
    } else {
      tags = rawTags;
    }
  } catch (e) {
    error = new Error(`Error parsing metadata for ${relativePath}`);
  }

  const snippetContent: SnippetContent = {
    title: metadata?.["Title"],
    description: metadata?.["Description"],
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

export default loadMarkdown;
