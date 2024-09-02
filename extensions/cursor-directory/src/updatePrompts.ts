import fs from "fs";
import path from "path";
import https from "https";
import { parse } from "@babel/parser";
import * as t from "@babel/types";
import type { Author, Prompt } from "./types";

const DATA_URL = "https://api.github.com/repos/pontusab/cursor.directory/contents/src/data";
const RULES_URL = DATA_URL + "/rules";
const OUTPUT_FILE = path.join(__dirname, "..", "src", "data", "prompts.json");

interface GithubFileContent {
  name: string;
  download_url: string;
}

interface RuleObject {
  tags?: string[];
  title?: string;
  slug?: string;
  content?: string;
  author?: {
    name?: string;
    url?: string;
    avatar?: string;
  };
  libs?: string[];
}

function fetchJson(url: string): Promise<GithubFileContent[]> {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: { "User-Agent": "Raycast Extension" },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(JSON.parse(data)));
        },
      )
      .on("error", reject);
  });
}

async function fetchFileContent(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

async function processRuleFile(file: GithubFileContent): Promise<Prompt[]> {
  const content = await fetchFileContent(file.download_url);

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

  if (!t.isVariableDeclarator(declaration)) {
    throw new Error(`Unexpected declaration type in ${file.name}`);
  }

  if (!t.isIdentifier(declaration.id) || !declaration.id.name.endsWith("Rules")) {
    throw new Error(`Expected identifier ending with 'Rules' in ${file.name}`);
  }

  if (!t.isArrayExpression(declaration.init)) {
    throw new Error(`Expected array expression for rules in ${file.name}`);
  }

  // Process each object in the array
  const rulesArray = declaration.init.elements.map((element) => {
    if (!element || !t.isObjectExpression(element)) {
      throw new Error(`Expected object expression in rules array in ${file.name}`);
    }

    const rule: RuleObject = {};
    // const rule = {} as Record<string, string | string[] | Record<string, string>>;

    element.properties.forEach((prop) => {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        const key = prop.key.name as keyof RuleObject;
        if (t.isStringLiteral(prop.value)) {
          if (key === "title" || key === "slug" || key === "content") {
            rule[key] = prop.value.value;
          }
        } else if (t.isTemplateLiteral(prop.value)) {
          const value = prop.value.quasis.map((quasi) => quasi.value.cooked).join("");
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
              if (t.isStringLiteral(subProp.value)) {
                rule.author![subKey] = subProp.value.value;
              } else if (t.isTemplateLiteral(subProp.value)) {
                rule.author![subKey] = subProp.value.quasis.map((quasi) => quasi.value.cooked).join("");
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
}

async function main() {
  try {
    const files: GithubFileContent[] = await fetchJson(RULES_URL);

    const tsFiles = files.filter((file) => file.name.endsWith(".ts"));

    console.log("Processing rule files...\n");

    const allPrompts = await Promise.all(tsFiles.map(processRuleFile));

    console.log("Writing rule files...\n");

    const flattenedPrompts = allPrompts.flat();

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(flattenedPrompts, null, 2));
    console.log(`Updated prompts saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error("Error updating prompts:", error);
  }
}

main();
