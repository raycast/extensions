import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { parse } from "yaml";
import type { Snippet, SnippetContent } from "../types";

const supportedExtensions = [".md", ".txt"];
async function loadAllSnippets(startPath: string): Promise<Snippet[]> {
  const files: Snippet[] = [];

  async function readDirectory(directoryPath: string) {
    const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry.name);

      if (!entry.name.startsWith(".")) {
        if (entry.isDirectory()) {
          await readDirectory(fullPath); // Recursive call for subdirectory
        } else if (supportedExtensions.includes(path.extname(entry.name))) {
          const relativePath = path.relative(startPath, fullPath);
          const parsedName = path.parse(entry.name).name;

          const hash = crypto.createHash("md5");
          hash.update(fullPath);
          const id = hash.digest("hex");

          const content = await readFileContent(fullPath);
          files.push({
            id: id,
            folder: path.dirname(relativePath),
            name: parsedName,
            fullPath: fullPath,
            content: content,
          });
        }
      }
    }
  }

  await readDirectory(startPath);
  return files;
}

function extractMetadataContent(fileContent: string): SnippetContent {
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
  const metadata = parse(rawMetadata);
  const content = lines.slice(contentStartIndex).join("\n").trim();

  return {
    title: metadata?.["Title"],
    description: metadata?.["Description"],
    content: content,
    rawMetadata: rawMetadata,
  };
}

async function readFileContent(fullPath: string): Promise<SnippetContent> {
  const fileContent = await fs.promises.readFile(fullPath, "utf8");
  return extractMetadataContent(fileContent);
}

function getPastableContent(content: string): string {
  if (!content) {
    return "";
  }

  let pastableContent = content;
  if (content.startsWith("```") && content.endsWith("```")) {
    const tmp = content.split("\n");
    const extractedLines = tmp.slice(1, tmp.length - 1);
    pastableContent = extractedLines.join("\n");
  }
  return pastableContent;
}

export { loadAllSnippets, getPastableContent };
