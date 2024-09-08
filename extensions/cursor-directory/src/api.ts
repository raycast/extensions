import type { Prompt, GithubFileContent, RuleObject, Author } from "./types";
import { parse } from "@babel/parser";
import * as t from "@babel/types";
import { PATH, URL } from "./constants";
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import fs from "fs/promises";
import { getTimestamp } from "./utils";

async function fetchFromGitHub(): Promise<GithubFileContent[]> {
  try {
    const response = await fetch(URL, {
      headers: { "User-Agent": "Raycast Extension" },
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return (await response.json()) as GithubFileContent[];
  } catch (error) {
    console.error("Error fetching from GitHub:", error);
    throw new Error("Failed to fetch data from GitHub");
  }
}

async function fetchFileContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error("Error fetching file content:", error);
    throw new Error(`Failed to fetch file content from ${url}`);
  }
}

async function processRuleFile(file: GithubFileContent): Promise<Prompt[]> {
  const content = await fetchFileContent(file.download_url);

  try {
    // Parse the TypeScript content
    const ast = parse(content, {
      sourceType: "module",
      plugins: ["typescript"],
    });

    // Find the export declaration
    const exportDeclaration = ast.program.body.find(
      (node) => t.isExportNamedDeclaration(node) && t.isVariableDeclaration(node.declaration),
    ) as t.ExportNamedDeclaration | undefined;

    if (!exportDeclaration || !t.isVariableDeclaration(exportDeclaration.declaration)) {
      throw new Error(`Could not find rules array in ${file.name}`);
    }

    const declaration = exportDeclaration.declaration.declarations[0];

    if (!t.isVariableDeclarator(declaration) || !t.isArrayExpression(declaration.init)) {
      throw new Error(`Unexpected declaration type in ${file.name}`);
    }

    // Process each object in the array
    const rulesArray = declaration.init.elements.map((element): RuleObject => {
      if (!element || !t.isObjectExpression(element)) {
        throw new Error(`Expected object expression in rules array in ${file.name}`);
      }

      const rule: RuleObject = {};

      element.properties.forEach((prop) => {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          const key = prop.key.name as keyof RuleObject;
          if (t.isStringLiteral(prop.value) || t.isTemplateLiteral(prop.value)) {
            const value = t.isStringLiteral(prop.value)
              ? prop.value.value
              : prop.value.quasis.map((quasi) => quasi.value.cooked).join("");
            if (key === "title" || key === "slug" || key === "content") {
              rule[key] = value;
            }
          } else if (t.isArrayExpression(prop.value)) {
            const value = prop.value.elements
              .map((el): string | null => (t.isStringLiteral(el) ? el.value : null))
              .filter((el): el is string => el !== null);
            if (key === "tags" || key === "libs") {
              rule[key] = value;
            }
          } else if (t.isObjectExpression(prop.value) && key === "author") {
            rule.author = {};
            prop.value.properties.forEach((subProp) => {
              if (t.isObjectProperty(subProp) && t.isIdentifier(subProp.key)) {
                const subKey = subProp.key.name as keyof Author;
                if (t.isStringLiteral(subProp.value) || t.isTemplateLiteral(subProp.value)) {
                  rule.author![subKey] = t.isStringLiteral(subProp.value)
                    ? subProp.value.value
                    : subProp.value.quasis.map((quasi) => quasi.value.cooked).join("");
                }
              }
            });
          }
        }
      });

      return rule;
    });

    return rulesArray.map(
      (rule): Prompt => ({
        tags: rule.tags || [],
        title: rule.title || "",
        slug: rule.slug || "",
        content: rule.content || "",
        author: rule.author
          ? {
              name: rule.author.name || "",
              url: rule.author.url || "",
              avatar: rule.author.avatar || "",
            }
          : { name: "", url: "", avatar: "" },
        libs: rule.libs || [],
      }),
    );
  } catch (error) {
    console.error(`Error processing rule file ${file.name}:`, error);
    throw new Error(`Failed to process rule file ${file.name}`);
  }
}

export async function fetchPrompts(): Promise<Prompt[]> {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const modified_timestamp = getTimestamp(PATH);

    if (
      modified_timestamp > 0 &&
      Date.now() - modified_timestamp < Number(preferences.cache_interval) * 1000 * 60 * 60 * 24
    ) {
      console.debug("Using cache...");
      const data = await fs.readFile(PATH, "utf8");
      return JSON.parse(data) as Prompt[];
    } else {
      console.debug("No cache found, fetching...");
      const files = await fetchFromGitHub();
      console.debug(`Fetched ${files.length} files from GitHub`);
      const allPrompts = await Promise.all(files.map(processRuleFile));
      console.debug(`Processed ${allPrompts.length} rule files`);
      const flattenedPrompts = allPrompts.flat();
      console.debug(`Total prompts: ${flattenedPrompts.length}`);

      await fs.writeFile(PATH, JSON.stringify(flattenedPrompts, null, 2));
      console.debug("Wrote prompts to cache file");
      return flattenedPrompts;
    }
  } catch (error) {
    console.error("Error in fetchPrompts:", error);
    throw new Error("Failed to fetch prompts");
  }
}
