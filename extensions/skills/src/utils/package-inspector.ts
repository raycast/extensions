import { lstat, readdir, readFile, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isIP } from "node:net";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseDocument } from "yaml";

export type PackageIssue = { level: "error" | "warning"; path: string; message: string };
export type InspectedSkill = {
  name: string;
  path: string;
  description?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
  valid: boolean;
  files: string[];
};
export type InspectedMcpServer = { name: string; type: string; valid: boolean };
export type PackageInspection = {
  root: string;
  kind: "skill" | "agent-plugin" | "claude-plugin" | "codex-plugin" | "unknown";
  name?: string;
  description?: string;
  version?: string;
  valid: boolean;
  skills: InspectedSkill[];
  mcpServers: InspectedMcpServer[];
  entries: string[];
  issues: PackageIssue[];
};

const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLUGIN_NAME = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const MANIFEST_KEYS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

async function pathExists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function addIssue(result: PackageInspection, level: PackageIssue["level"], path: string, message: string) {
  result.issues.push({ level, path, message });
}

function inside(root: string, target: string) {
  const path = relative(root, target);
  return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

async function containedPackagePath(root: string, value: string) {
  const path = resolve(root, value);
  if (!inside(root, path)) return false;
  // A missing file can still have an existing parent symlink outside the root.
  let ancestor = path;
  while (inside(root, ancestor)) {
    try {
      return inside(root, await realpath(ancestor));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return false;
      ancestor = dirname(ancestor);
    }
  }
  return false;
}

async function safeStat(
  result: PackageInspection,
  path: string,
): Promise<Awaited<ReturnType<typeof stat>> | undefined> {
  try {
    const target = await realpath(path);
    if (!inside(result.root, target)) {
      addIssue(result, "error", relative(result.root, path), "Path resolves outside the package root");
      return undefined;
    }
    return await stat(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (await pathExists(path)) addIssue(result, "error", relative(result.root, path), "Path is a dangling symlink");
      return undefined;
    }
    addIssue(result, "error", relative(result.root, path), `Cannot inspect path: ${String(error)}`);
    return undefined;
  }
}

async function readJson(result: PackageInspection, path: string): Promise<Record<string, unknown> | undefined> {
  const info = await safeStat(result, path);
  if (!info) return undefined;
  if (!info.isFile()) {
    addIssue(result, "error", relative(result.root, path), "Expected a regular JSON file");
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (isObject(value)) return value;
  } catch {
    // Report invalid JSON with the same message as invalid top-level data.
  }
  addIssue(result, "error", relative(result.root, path), "Expected a JSON object");
  return undefined;
}

async function resourceFiles(result: PackageInspection, directory: string): Promise<string[]> {
  const files: string[] = [];
  const visited = new Set<string>();
  let inspected = 0;
  let truncated = false;
  async function walk(path: string) {
    const target = await realpath(path);
    if (visited.has(target)) return;
    visited.add(target);
    for (const entry of await readdir(path)) {
      if (inspected >= 500) {
        if (!truncated)
          addIssue(result, "warning", relative(result.root, directory), "Resource list truncated at 500 entries");
        truncated = true;
        return;
      }
      inspected++;
      const child = join(path, entry);
      const info = await safeStat(result, child);
      if (!info) continue;
      if (info.isDirectory()) await walk(child);
      else if (info.isFile() && child !== join(directory, "SKILL.md")) files.push(relative(directory, child));
    }
  }
  await walk(directory);
  return files.sort();
}

async function inspectSkill(result: PackageInspection, directory: string) {
  const path = join(directory, "SKILL.md");
  const info = await safeStat(result, path);
  if (!info) return;
  if (!info.isFile()) {
    addIssue(result, "error", relative(result.root, path), "Expected a regular SKILL.md file");
    return;
  }
  const issueCount = result.issues.filter((issue) => issue.level === "error").length;
  const skill: InspectedSkill = {
    name: basename(directory),
    path: relative(result.root, directory) || ".",
    valid: true,
    files: [],
  };
  let metadata: unknown;
  try {
    const text = await readFile(path, "utf8");
    const match = text.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    if (!match) throw new Error("SKILL.md needs YAML frontmatter");
    const document = parseDocument(match[1]);
    if (document.errors.length) throw new Error(document.errors[0].message);
    metadata = document.toJS();
  } catch (error) {
    addIssue(result, "error", relative(result.root, path), String(error));
  }
  if (isObject(metadata)) {
    const { name, description, license, compatibility } = metadata;
    if (typeof name !== "string" || name.length > 64 || !NAME.test(name) || name !== basename(directory)) {
      addIssue(result, "error", relative(result.root, path), "Invalid name or name does not match the skill directory");
    } else skill.name = name;
    if (typeof description !== "string" || description.length < 1 || description.length > 1024) {
      addIssue(result, "error", relative(result.root, path), "description must be 1–1024 characters");
    } else skill.description = description;
    if (license !== undefined && typeof license !== "string")
      addIssue(result, "error", skill.path, "license must be a string");
    else if (typeof license === "string") skill.license = license;
    if (
      compatibility !== undefined &&
      (typeof compatibility !== "string" || !compatibility.length || compatibility.length > 500)
    ) {
      addIssue(result, "error", skill.path, "compatibility must be 1–500 characters");
    } else if (typeof compatibility === "string") skill.compatibility = compatibility;
    if (
      metadata.metadata !== undefined &&
      (!isObject(metadata.metadata) || Object.values(metadata.metadata).some((value) => typeof value !== "string"))
    ) {
      addIssue(result, "error", skill.path, "metadata must map strings to strings");
    } else if (isObject(metadata.metadata)) skill.metadata = metadata.metadata as Record<string, string>;
    if (metadata["allowed-tools"] !== undefined && typeof metadata["allowed-tools"] !== "string") {
      addIssue(result, "error", skill.path, "allowed-tools must be a string");
    } else if (typeof metadata["allowed-tools"] === "string") skill.allowedTools = metadata["allowed-tools"];
  } else if (metadata !== undefined) {
    addIssue(result, "error", relative(result.root, path), "Frontmatter must be a YAML mapping");
  }
  skill.files = await resourceFiles(result, directory);
  skill.valid = result.issues.filter((issue) => issue.level === "error").length === issueCount;
  result.skills.push(skill);
}

async function inspectSkillsDirectory(result: PackageInspection) {
  const directory = join(result.root, "skills");
  const info = await safeStat(result, directory);
  if (!info) return;
  if (!info.isDirectory()) {
    addIssue(result, "error", "skills", "Expected skills/ to be a directory");
    return;
  }
  for (const name of (await readdir(directory)).sort()) {
    const child = join(directory, name);
    if ((await safeStat(result, child))?.isDirectory()) await inspectSkill(result, child);
  }
}

function validateManifest(result: PackageInspection, manifest: Record<string, unknown>): boolean {
  if (manifest.$schema !== PLUGIN_SCHEMA) addIssue(result, "error", "plugin.json", "Unsupported or missing $schema");
  if (typeof manifest.name !== "string" || manifest.name.length > 64 || !PLUGIN_NAME.test(manifest.name)) {
    addIssue(result, "error", "plugin.json", "Invalid plugin name");
  } else result.name = manifest.name;
  for (const key of ["version", "description", "homepage", "repository", "license"]) {
    if (manifest[key] !== undefined && typeof manifest[key] !== "string")
      addIssue(result, "error", "plugin.json", `${key} must be a string`);
  }
  if (
    manifest.author !== undefined &&
    (!isObject(manifest.author) ||
      Object.entries(manifest.author).some(
        ([key, value]) => !["name", "email", "url"].includes(key) || typeof value !== "string",
      ))
  ) {
    addIssue(result, "error", "plugin.json", "author must contain only name, email, and url strings");
  }
  if (
    manifest.keywords !== undefined &&
    (!Array.isArray(manifest.keywords) || manifest.keywords.some((value) => typeof value !== "string"))
  ) {
    addIssue(result, "error", "plugin.json", "keywords must be an array of strings");
  }
  if (manifest.extensions !== undefined && !isObject(manifest.extensions)) {
    addIssue(result, "warning", "plugin.json", "Ignoring non-object extensions");
  }
  for (const key of Object.keys(manifest)) {
    if (!MANIFEST_KEYS.has(key)) addIssue(result, "warning", "plugin.json", `Ignoring unknown field: ${key}`);
  }
  result.description = typeof manifest.description === "string" ? manifest.description : undefined;
  result.version = typeof manifest.version === "string" ? manifest.version : undefined;
  return !result.issues.some((issue) => issue.level === "error");
}

async function validServer(result: PackageInspection, name: string, value: unknown): Promise<InspectedMcpServer> {
  const server: InspectedMcpServer = {
    name,
    type: isObject(value) && typeof value.type === "string" ? value.type : "unknown",
    valid: true,
  };
  const fail = (message: string) => {
    server.valid = false;
    addIssue(result, "error", `mcp.json:${name}`, message);
  };
  if (!isObject(value)) fail("Server must be an object");
  else if (value.type === "stdio") {
    if (typeof value.command !== "string" || (!value.command.startsWith("./") && !/^[^\s/\\]+$/.test(value.command)))
      fail("Invalid stdio command");
    else if (value.command.startsWith("./")) {
      if (!(await containedPackagePath(result.root, value.command))) fail("Command escapes package root");
      else if (!(await safeStat(result, resolve(result.root, value.command)))?.isFile())
        fail("Plugin-relative command must be an existing file");
    }
    if (value.cwd !== undefined) {
      if (typeof value.cwd !== "string") fail("Invalid stdio cwd");
      else if (value.cwd === "${PLUGIN_DATA}" || value.cwd.startsWith("${PLUGIN_DATA}/")) {
        const dataRoot = resolve(result.root, ".plugin-data");
        const suffix = value.cwd === "${PLUGIN_DATA}" ? "" : value.cwd.slice(15);
        if (!inside(dataRoot, resolve(dataRoot, suffix))) fail("cwd escapes PLUGIN_DATA");
      } else {
        const cwd =
          value.cwd === "${PLUGIN_ROOT}"
            ? "./"
            : value.cwd.startsWith("${PLUGIN_ROOT}/")
              ? `./${value.cwd.slice(15)}`
              : value.cwd;
        if (!cwd.startsWith("./") || !(await containedPackagePath(result.root, cwd))) fail("cwd escapes package root");
        else if (!(await safeStat(result, resolve(result.root, cwd)))?.isDirectory())
          fail("Plugin-relative cwd must be an existing directory");
      }
    }
    if (value.args !== undefined && (!Array.isArray(value.args) || value.args.some((arg) => typeof arg !== "string")))
      fail("args must be strings");
    if (
      value.env !== undefined &&
      (!isObject(value.env) || Object.values(value.env).some((item) => typeof item !== "string"))
    )
      fail("env must map strings to strings");
    if (
      isObject(value.env) &&
      Object.keys(value.env).some((key) => ["PLUGIN_ROOT", "PLUGIN_DATA"].includes(key.toUpperCase()))
    )
      fail("env must not override PLUGIN_ROOT or PLUGIN_DATA");
    if (Object.keys(value).some((key) => !["type", "command", "args", "env", "cwd"].includes(key)))
      fail("Unknown stdio server field");
  } else if (value.type === "streamable-http" || value.type === "sse") {
    try {
      if (typeof value.url !== "string") throw new Error();
      const url = new URL(value.url);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) throw new Error();
      const host = url.hostname.replace(/^\[|\]$/g, "");
      const loopback =
        host === "localhost" || (isIP(host) === 4 && host.startsWith("127.")) || (isIP(host) === 6 && host === "::1");
      if (url.protocol === "http:" && !loopback) throw new Error();
    } catch {
      fail("Invalid or insecure MCP URL");
    }
    if (value.headers !== undefined) {
      if (!isObject(value.headers) || Object.values(value.headers).some((item) => typeof item !== "string")) {
        fail("headers must map strings to strings");
      } else {
        const names = new Set<string>();
        for (const [name, headerValue] of Object.entries(value.headers)) {
          const lower = name.toLowerCase();
          if (names.has(lower)) fail("Duplicate HTTP header name");
          names.add(lower);
          try {
            new Headers([[name, headerValue as string]]);
          } catch {
            fail("Invalid HTTP header field");
          }
        }
      }
    }
    if (Object.keys(value).some((key) => !["type", "url", "headers"].includes(key))) fail("Unknown HTTP server field");
  } else fail("Unsupported MCP transport");
  return server;
}

async function inspectMcp(result: PackageInspection) {
  const path = join(result.root, "mcp.json");
  const info = await safeStat(result, path);
  if (!info) return;
  const config = await readJson(result, path);
  if (!config) return;
  if (
    config.$schema !== MCP_SCHEMA ||
    !isObject(config.mcpServers) ||
    Object.keys(config).some((key) => !["$schema", "mcpServers"].includes(key))
  ) {
    addIssue(result, "error", "mcp.json", "Invalid MCP configuration schema");
    return;
  }
  for (const [name, value] of Object.entries(config.mcpServers))
    result.mcpServers.push(await validServer(result, name, value));
}

export async function inspectLocalPackage(input: string): Promise<PackageInspection> {
  if (!input.trim()) throw new Error("Enter a local package folder");
  const expanded = input.startsWith("~/") ? join(homedir(), input.slice(2)) : input;
  const root = await realpath(resolve(expanded));
  if (!(await stat(root)).isDirectory()) throw new Error("Choose a package directory");
  const result: PackageInspection = {
    root,
    kind: "unknown",
    valid: true,
    skills: [],
    mcpServers: [],
    entries: (await readdir(root, { withFileTypes: true }))
      .map((entry) => `${entry.name}${entry.isDirectory() ? "/" : ""}`)
      .sort(),
    issues: [],
  };
  const manifestPath = join(root, "plugin.json");
  if (await pathExists(manifestPath)) {
    result.kind = "agent-plugin";
    const manifest = await readJson(result, manifestPath);
    if (manifest && validateManifest(result, manifest)) {
      await inspectSkillsDirectory(result);
      await inspectMcp(result);
    }
  } else if (await pathExists(join(root, "SKILL.md"))) {
    result.kind = "skill";
    await inspectSkill(result, root);
    result.name = result.skills[0]?.name;
    result.description = result.skills[0]?.description;
  } else {
    for (const [kind, path] of [
      ["claude-plugin", ".claude-plugin/plugin.json"],
      ["codex-plugin", ".codex-plugin/plugin.json"],
    ] as const) {
      if (!(await pathExists(join(root, path)))) continue;
      result.kind = kind;
      const manifest = await readJson(result, join(root, path));
      result.name = typeof manifest?.name === "string" ? manifest.name : undefined;
      result.description = typeof manifest?.description === "string" ? manifest.description : undefined;
      result.version = typeof manifest?.version === "string" ? manifest.version : undefined;
      await inspectSkillsDirectory(result);
      addIssue(result, "warning", path, "Host-specific manifest and components are recognized but not fully validated");
      break;
    }
  }
  if (result.kind === "unknown") addIssue(result, "error", ".", "No Agent Skill or Plugin manifest found");
  result.valid = !result.issues.some((issue) => issue.level === "error");
  return result;
}
