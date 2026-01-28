import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { Snippet, SnippetContent } from "../../types";
import { parse } from "yaml";

function extractSnippet(
  relativePath: string,
  fullPath: string,
  index: number,
  snippetRaw: { [key: string]: any }
): Snippet | null {
  const hash = crypto.createHash("md5");
  hash.update(fullPath + index);
  const id = hash.digest("hex");

  const title = snippetRaw["title"]!;
  if (!title) {
    throw new Error(`Yaml error: title required for all snippets in ${relativePath}`);
  }
  const description = snippetRaw["description"] ?? "";

  let content;
  const rawCode = snippetRaw["code"];
  if (rawCode) {
    const language = snippetRaw["language"] ?? "";
    content = `\`\`\`${language}
${rawCode}
\`\`\``;
  } else {
    content = snippetRaw["content"];
  }

  if (!content) {
    throw new Error(`Yaml error: code or content required for all snippets in ${relativePath}`);
  }

  let tags: string[] = [];
  // Parse tags
  const rawTags = snippetRaw["tags"] ?? [];
  if (!Array.isArray(rawTags) || rawTags.some((tag) => typeof tag !== "string")) {
    throw new Error(`Invalid tags. All tags must be a string for ${relativePath}`);
  } else {
    tags = rawTags;
  }

  const snippet: Snippet = {
    id: id,
    folder: path.dirname(relativePath),
    name: title,
    content: {
      title: title,
      description: description,
      tags: tags,
      content: content,
      rawMetadata: title + description,
    },
  };
  return snippet;
}

async function loadYaml(relativePath: string, fullPath: string): Promise<{ snippets: Snippet[]; errors: Error[] }> {
  const fileContent = await fs.promises.readFile(fullPath, "utf8");

  let errors: Error[] = [];
  const snippets: Snippet[] = [];

  let yamlContent;
  try {
    yamlContent = parse(fileContent);
  } catch (e) {
    errors = [new Error(`Incorrect yaml file ${relativePath}`)];
  }

  if (yamlContent) {
    try {
      if (Array.isArray(yamlContent)) {
        // Handle the case where `yamlContent` is an array
        const extracted = yamlContent
          .map((item: any, index: number) => {
            return extractSnippet(relativePath, fullPath, index, item);
          })
          .filter((item): item is Snippet => {
            return item !== null;
          });

        snippets.push(...extracted);
      } else if (typeof yamlContent === "object" && "snippets" in yamlContent) {
        // Handle the case where `yamlContent` is an object with a property named "snippets"
        const yamlSnippets = yamlContent.snippets;
        if (Array.isArray(yamlSnippets)) {
          const extracted = yamlSnippets
            .map((item: any, index: number) => {
              return extractSnippet(relativePath, fullPath, index, item);
            })
            .filter((item): item is Snippet => {
              return item !== null;
            });
          snippets.push(...extracted);
        } else {
          errors = [new Error(`Incorrect yaml file ${relativePath}`)];
        }
      } else {
        errors = [new Error(`Incorrect yaml file ${relativePath}`)];
      }
    } catch (e: any) {
      errors = [e];
    }
  }

  return { snippets: snippets, errors: errors };
}

export default loadYaml;
