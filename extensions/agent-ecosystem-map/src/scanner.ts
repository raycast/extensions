import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { getPreferenceValues } from "@raycast/api";
import { Asset, Provider, ScanResult } from "./types";

const HOME = homedir();

function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!content.startsWith("---")) return result;

  const endIndex = content.indexOf("---", 3);
  if (endIndex === -1) return result;

  const frontmatter = content.substring(3, endIndex).trim();
  for (const line of frontmatter.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    if (value === "" || value === "|" || value === ">") continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function extractFirstLine(content: string): string {
  const lines = content.split("\n");
  let i = 0;

  // Skip frontmatter only if the very first line is "---"
  if (lines[0]?.trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") i++;
    i++; // skip closing ---
  }

  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed === "---" || trimmed.startsWith("#")) continue;
    return trimmed.substring(0, 200);
  }
  return "";
}

interface MdFile {
  name: string;
  filePath: string;
}

const SKIP_NAMES = new Set([
  "INDEX",
  "README",
  "EXAMPLES",
  "QUICK-REFERENCE",
  "AGENTS",
  "CHANGELOG",
]);

function findMdFiles(dir: string, prefix = ""): MdFile[] {
  const results: MdFile[] = [];
  if (!existsSync(dir)) return results;

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const subPrefix = prefix ? `${prefix}:${entry.name}` : entry.name;
      results.push(...findMdFiles(fullPath, subPrefix));
    } else if (entry.name.endsWith(".md")) {
      const baseName = entry.name.replace(/\.md$/, "");
      if (SKIP_NAMES.has(baseName)) continue;
      const name = prefix ? `${prefix}:${baseName}` : baseName;
      results.push({ name, filePath: fullPath });
    }
  }
  return results;
}

function readSafe(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

interface McpSearchPath {
  mcpPath: string;
  providers: Provider[];
}

function scanMcpServers(searchPaths: McpSearchPath[]): Asset[] {
  const servers: Asset[] = [];
  const seen = new Map<string, Asset>();

  for (const { mcpPath, providers } of searchPaths) {
    if (!existsSync(mcpPath)) continue;
    try {
      const raw = JSON.parse(readFileSync(mcpPath, "utf-8"));
      const mcpServers: Record<
        string,
        Record<string, unknown>
      > = raw.mcpServers || raw.servers || {};
      for (const [name, config] of Object.entries(mcpServers)) {
        const existing = seen.get(name);
        if (existing) {
          for (const p of providers) {
            if (!existing.providers.includes(p)) existing.providers.push(p);
          }
          continue;
        }
        const asset: Asset = {
          name,
          desc: (config.description as string) || `MCP server: ${name}`,
          type: "mcp",
          transport: (config.type as string) || "stdio",
          command: (config.command as string) || "",
          filePath: mcpPath,
          providers: [...providers],
          source: providers[0],
        };
        seen.set(name, asset);
        servers.push(asset);
      }
    } catch {
      /* skip invalid json */
    }
  }
  return servers;
}

function scanMdAssets(
  dir: string,
  type: Asset["type"],
  providers: Provider[],
  source: string,
): Asset[] {
  return findMdFiles(dir).map(({ name, filePath }) => {
    const content = readSafe(filePath);
    const parsed = parseFrontmatter(content);
    return {
      name: parsed.name || name,
      desc:
        parsed.description || extractFirstLine(content) || `${type}: ${name}`,
      type,
      providers: [...providers],
      filePath,
      source,
    };
  });
}

export function scan(): ScanResult {
  const skills: Asset[] = [];
  const agents: Asset[] = [];
  const instructions: Asset[] = [];
  const rules: Asset[] = [];

  const claudeDir = join(HOME, ".claude");
  const prefs = getPreferenceValues<{ projectPath?: string }>();
  const projectRoot = prefs.projectPath || HOME;

  // 1. Claude Code
  skills.push(
    ...scanMdAssets(join(claudeDir, "commands"), "skill", ["claude"], "claude"),
  );
  agents.push(
    ...scanMdAssets(join(claudeDir, "agents"), "agent", ["claude"], "claude"),
  );
  rules.push(
    ...scanMdAssets(join(claudeDir, "rules"), "rule", ["claude"], "claude"),
  );

  const globalClaudeMd = join(claudeDir, "CLAUDE.md");
  if (existsSync(globalClaudeMd)) {
    instructions.push({
      name: "CLAUDE.md (global)",
      desc:
        extractFirstLine(readSafe(globalClaudeMd)) ||
        "Claude global instructions",
      type: "instruction",
      providers: ["claude"],
      filePath: globalClaudeMd,
      source: "claude",
    });
  }

  const projectClaudeMd = join(projectRoot, "CLAUDE.md");
  if (existsSync(projectClaudeMd)) {
    instructions.push({
      name: "CLAUDE.md (project)",
      desc:
        extractFirstLine(readSafe(projectClaudeMd)) ||
        "Claude project instructions",
      type: "instruction",
      providers: ["claude"],
      filePath: projectClaudeMd,
      source: "claude",
    });
  }

  // 2. Codex CLI
  const codexDir = join(HOME, ".codex");
  if (existsSync(codexDir)) {
    skills.push(
      ...scanMdAssets(
        join(codexDir, "skills", "public"),
        "skill",
        ["codex"],
        "codex",
      ),
    );
    agents.push(
      ...scanMdAssets(join(codexDir, "agents"), "agent", ["codex"], "codex"),
    );

    const codexInstr = join(codexDir, "instructions.md");
    if (existsSync(codexInstr)) {
      instructions.push({
        name: "codex-instructions",
        desc:
          extractFirstLine(readSafe(codexInstr)) || "Codex global instructions",
        type: "instruction",
        providers: ["codex"],
        filePath: codexInstr,
        source: "codex",
      });
    }
  }

  const agentsMd = join(projectRoot, "AGENTS.md");
  if (existsSync(agentsMd)) {
    instructions.push({
      name: "AGENTS.md",
      desc:
        extractFirstLine(readSafe(agentsMd)) || "Cross-IDE agent instructions",
      type: "instruction",
      providers: ["codex", "copilot", "cursor", "windsurf"],
      filePath: agentsMd,
      source: "shared",
    });
  }

  // 3. Gemini CLI
  const geminiDir = join(HOME, ".gemini");
  if (existsSync(geminiDir)) {
    skills.push(
      ...scanMdAssets(join(geminiDir, "skills"), "skill", ["gemini"], "gemini"),
    );

    for (const fname of ["instructions.md", "GEMINI.md"]) {
      const fpath = join(geminiDir, fname);
      if (existsSync(fpath)) {
        instructions.push({
          name: `gemini-${fname.replace(".md", "").toLowerCase()}`,
          desc: extractFirstLine(readSafe(fpath)) || "Gemini instructions",
          type: "instruction",
          providers: ["gemini"],
          filePath: fpath,
          source: "gemini",
        });
      }
    }
  }

  const geminiMd = join(projectRoot, "GEMINI.md");
  if (existsSync(geminiMd)) {
    instructions.push({
      name: "GEMINI.md",
      desc:
        extractFirstLine(readSafe(geminiMd)) || "Gemini project instructions",
      type: "instruction",
      providers: ["gemini"],
      filePath: geminiMd,
      source: "gemini",
    });
  }

  // 4. Cursor
  const cursorRulesDir = join(projectRoot, ".cursor", "rules");
  rules.push(...scanMdAssets(cursorRulesDir, "rule", ["cursor"], "cursor"));

  const cursorrules = join(projectRoot, ".cursorrules");
  if (existsSync(cursorrules)) {
    instructions.push({
      name: ".cursorrules",
      desc:
        extractFirstLine(readSafe(cursorrules)) || "Cursor instructions file",
      type: "instruction",
      providers: ["cursor"],
      filePath: cursorrules,
      source: "cursor",
    });
  }

  // 5. Windsurf
  const wsRulesDir = join(projectRoot, ".windsurf", "rules");
  rules.push(...scanMdAssets(wsRulesDir, "rule", ["windsurf"], "windsurf"));

  const wsrules = join(projectRoot, ".windsurfrules");
  if (existsSync(wsrules)) {
    instructions.push({
      name: ".windsurfrules",
      desc: extractFirstLine(readSafe(wsrules)) || "Windsurf instructions file",
      type: "instruction",
      providers: ["windsurf"],
      filePath: wsrules,
      source: "windsurf",
    });
  }

  // 6. GitHub Copilot
  const copilotInstr = join(projectRoot, ".github", "copilot-instructions.md");
  if (existsSync(copilotInstr)) {
    instructions.push({
      name: "copilot-instructions",
      desc:
        extractFirstLine(readSafe(copilotInstr)) ||
        "GitHub Copilot instructions",
      type: "instruction",
      providers: ["copilot"],
      filePath: copilotInstr,
      source: "copilot",
    });
  }

  // 7. Continue.dev
  const continueConfig = join(HOME, ".continue", "config.json");
  if (existsSync(continueConfig)) {
    instructions.push({
      name: "continue-config",
      desc: "Continue.dev configuration",
      type: "instruction",
      providers: ["continue_dev"],
      filePath: continueConfig,
      source: "continue",
    });
  }

  // 8. MCP Servers
  const mcpSearchPaths: McpSearchPath[] = [
    { mcpPath: join(claudeDir, ".mcp.json"), providers: ["claude"] },
    { mcpPath: join(claudeDir, "mcp.json"), providers: ["claude"] },
    { mcpPath: join(HOME, ".codex", "mcp.json"), providers: ["codex"] },
    { mcpPath: join(HOME, ".gemini", "mcp.json"), providers: ["gemini"] },
    { mcpPath: join(HOME, ".windsurf", "mcp.json"), providers: ["windsurf"] },
    {
      mcpPath: join(projectRoot, ".mcp.json"),
      providers: ["claude", "cursor"],
    },
    { mcpPath: join(projectRoot, "mcp.json"), providers: ["claude", "cursor"] },
    {
      mcpPath: join(HOME, ".continue", "config.json"),
      providers: ["continue_dev"],
    },
  ];
  const mcpServers = scanMcpServers(mcpSearchPaths);

  return { skills, agents, mcpServers, instructions, rules };
}

export function getAllAssets(result: ScanResult): Asset[] {
  return [
    ...result.skills,
    ...result.agents,
    ...result.mcpServers,
    ...result.instructions,
    ...result.rules,
  ];
}

export function getStats(result: ScanResult) {
  const all = getAllAssets(result);
  const providerSet = new Set<string>();
  for (const a of all) {
    for (const p of a.providers) providerSet.add(p);
  }
  return {
    total: all.length,
    skills: result.skills.length,
    agents: result.agents.length,
    mcpServers: result.mcpServers.length,
    instructions: result.instructions.length,
    rules: result.rules.length,
    providers: providerSet.size,
  };
}
