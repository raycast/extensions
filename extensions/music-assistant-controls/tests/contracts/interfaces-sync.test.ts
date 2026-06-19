import fs from "fs";
import path from "path";

type CommandDefinition = {
  return_type?: string;
  parameters?: Array<{ type?: string }>;
};

const IGNORED_TYPE_TOKENS = new Set(["Any", "Array", "AsyncGenerator", "None", "Sequence"]);

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function getExportedInterfaceSymbols(interfacesSource: string): Set<string> {
  const exports = new Set<string>();
  const exportPatterns = [/export\s+interface\s+(\w+)/g, /export\s+type\s+(\w+)/g, /export\s+enum\s+(\w+)/g];

  for (const pattern of exportPatterns) {
    for (const match of interfacesSource.matchAll(pattern)) {
      exports.add(match[1]);
    }
  }

  return exports;
}

function extractTypeTokens(typeDefinition?: string): string[] {
  if (!typeDefinition) return [];
  const normalizedType = typeDefinition.replace(/<enum\s+'([A-Za-z_][A-Za-z0-9_]*)/g, "$1");
  const matches = normalizedType.match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? [];
  return matches.filter((token) => !IGNORED_TYPE_TOKENS.has(token));
}

describe("commands.json and interfaces.ts sync", () => {
  it("exports all model names referenced by command types", () => {
    const commands = JSON.parse(readFile("commands.json")) as CommandDefinition[];
    const interfacesSource = readFile("src/music-assistant/external-code/interfaces.ts");

    const exportedSymbols = getExportedInterfaceSymbols(interfacesSource);
    const referencedSymbols = new Set<string>();

    for (const command of commands) {
      for (const token of extractTypeTokens(command.return_type)) {
        referencedSymbols.add(token);
      }

      for (const parameter of command.parameters ?? []) {
        for (const token of extractTypeTokens(parameter.type)) {
          referencedSymbols.add(token);
        }
      }
    }

    const missingSymbols = [...referencedSymbols].filter((symbol) => !exportedSymbols.has(symbol)).sort();

    expect(missingSymbols).toEqual([]);
  });
});
