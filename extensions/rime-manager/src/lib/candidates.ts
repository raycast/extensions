import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import YAML from "yaml";
import { environment } from "@raycast/api";

import type { BlockRule, LowerRule, PinRule, RimeInstallation, RimeSchema } from "../types";
import {
  BLOCK_FILTER_LUA_NAME,
  MANAGED_BLOCK_FILTER_END,
  MANAGED_BLOCK_FILTER_START,
  MANAGED_LOWER_FILTER_END,
  MANAGED_LOWER_FILTER_START,
  MANAGED_PIN_END,
  MANAGED_PIN_START,
  LOWER_FILTER_LUA_NAME,
  PIN_FILTER_LUA_NAME,
} from "./constants";
import { readText, writeTextAtomically } from "./files";
import { replaceManagedPatchBlock } from "./managed-block";
import { cleanCandidateText, cleanCode, ensureTrailingNewline, yamlString } from "./text";

function extractManagedLines(source: string, start: string, end: string): string[] {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex < 0 || endIndex <= startIndex) return [];
  return source.slice(startIndex + start.length, endIndex).split("\n");
}

function decodeYamlScalar(value: string): string | undefined {
  try {
    const decoded = YAML.parse(value);
    return typeof decoded === "string" ? decoded : undefined;
  } catch {
    return undefined;
  }
}

export async function readPinRules(installation: RimeInstallation): Promise<PinRule[]> {
  const perSchema = await Promise.all(
    installation.schemas.map(async (schema) => {
      const source = await readText(schema.customPath);
      return extractManagedLines(source, MANAGED_PIN_START, MANAGED_PIN_END).flatMap((line, index) => {
        const match = line.match(/^\s*-\s+(.+)$/);
        if (!match) return [];
        const decoded = decodeYamlScalar(match[1]);
        if (!decoded) return [];
        const [code, candidates = ""] = decoded.split("\t", 2);
        if (!code || !candidates) return [];
        return [
          {
            id: `${schema.id}:${index}:${code}`,
            schemaId: schema.id,
            schemaName: schema.name,
            code,
            candidates: candidates.includes(" > ") ? candidates.split(" > ") : candidates.split(" "),
          } satisfies PinRule,
        ];
      });
    }),
  );
  return perSchema.flat();
}

function pinPatchLines(schema: RimeSchema, rules: PinRule[]): string[] | undefined {
  if (rules.length === 0) return undefined;
  const key = schema.hasPinCandidateFilter ? '"pin_cand_filter/+":' : "raycast_pin_cand_filter:";
  const filterLine = schema.hasPinCandidateFilter
    ? []
    : ['"engine/filters/@before 0": "lua_filter@*raycast_pin_cand_filter"'];
  return [
    ...filterLine,
    key,
    ...rules.map((rule) => {
      const separator = rule.candidates.some((candidate) => candidate.includes(" ")) ? " > " : " ";
      return `  - ${yamlString(`${rule.code}\t${rule.candidates.join(separator)}`)}`;
    }),
  ];
}

async function ensureLuaAsset(installation: RimeInstallation, assetName: string): Promise<void> {
  const destination = join(installation.userDataDir, "lua", assetName);
  await mkdir(dirname(destination), { recursive: true });
  const source = await readText(join(environment.assetsPath, assetName));
  if (!source) throw new Error(`The extension asset is missing: ${assetName}`);
  await writeTextAtomically(destination, source, join(installation.userDataDir, ".raycast-rime-manager", "backups"));
}

export async function savePinRules(installation: RimeInstallation, schemaId: string, rules: PinRule[]): Promise<void> {
  const schema = installation.schemas.find((item) => item.id === schemaId);
  if (!schema) throw new Error(`Rime schema not found: ${schemaId}`);
  if (!schema.hasPinCandidateFilter && rules.length > 0) await ensureLuaAsset(installation, PIN_FILTER_LUA_NAME);
  const source = await readText(schema.customPath, "patch:\n");
  const next = replaceManagedPatchBlock(source, MANAGED_PIN_START, MANAGED_PIN_END, pinPatchLines(schema, rules));
  await writeTextAtomically(
    schema.customPath,
    next,
    join(installation.userDataDir, ".raycast-rime-manager", "backups"),
  );
}

export function createPinRule(schema: RimeSchema, code: string, candidates: string[]): PinRule {
  const normalizedCode = cleanCode(code);
  const normalizedCandidates = candidates.map(cleanCandidateText).filter(Boolean);
  if (!normalizedCode) throw new Error("Enter the input code for the candidate.");
  if (normalizedCandidates.length === 0) throw new Error("Enter at least one candidate.");
  return {
    id: `${schema.id}:${Date.now()}:${normalizedCode}`,
    schemaId: schema.id,
    schemaName: schema.name,
    code: normalizedCode,
    candidates: [...new Set(normalizedCandidates)],
  };
}

export async function readBlockRules(installation: RimeInstallation): Promise<BlockRule[]> {
  const source = await readText(installation.blockedWordsPath);
  return source.split(/\r?\n/).flatMap((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return [];
    const contains = trimmed.match(/^contains:(.+)$/);
    const value = (contains?.[1] ?? trimmed).trim();
    if (!value) return [];
    return [{ id: `block-${index}`, value, kind: contains ? "contains" : "exact" } satisfies BlockRule];
  });
}

export async function readLowerRules(installation: RimeInstallation): Promise<LowerRule[]> {
  const source = await readText(installation.loweredWordsPath);
  return source.split(/\r?\n/).flatMap((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return [];
    const [value = "", code = ""] = trimmed.split("\t", 2).map((item) => item.trim());
    if (!value || !code) return [];
    return [{ id: `lower-${index}`, value, code } satisfies LowerRule];
  });
}

function renderBlockRules(rules: BlockRule[]): string {
  const header = "# Managed by Rime Manager\n# Plain lines are exact matches; contains: matches substrings.";
  const body = rules.map((rule) => (rule.kind === "contains" ? `contains:${rule.value}` : rule.value)).join("\n");
  return ensureTrailingNewline(`${header}${body ? `\n${body}` : ""}`);
}

function renderLowerRules(rules: LowerRule[]): string {
  const header = [
    "# Managed by Rime Manager",
    "# Each rule is word<TAB>code. Values are intentionally not displayed in Raycast after saving.",
  ].join("\n");
  const body = rules.map((rule) => `${cleanCandidateText(rule.value)}\t${cleanCode(rule.code)}`).join("\n");
  return ensureTrailingNewline(`${header}${body ? `\n${body}` : ""}`);
}

async function ensureBlockFilter(installation: RimeInstallation, schema: RimeSchema): Promise<void> {
  if (schema.hasExistingBlockedWordsFilter) return;
  const filterName = installation.hasExistingBlockedWordsFilter
    ? "blocked_words_filter"
    : "raycast_blocked_words_filter";
  if (!installation.hasExistingBlockedWordsFilter) await ensureLuaAsset(installation, BLOCK_FILTER_LUA_NAME);
  const source = await readText(schema.customPath, "patch:\n");
  const next = replaceManagedPatchBlock(source, MANAGED_BLOCK_FILTER_START, MANAGED_BLOCK_FILTER_END, [
    `"engine/filters/@before last": "lua_filter@*${filterName}"`,
  ]);
  await writeTextAtomically(
    schema.customPath,
    next,
    join(installation.userDataDir, ".raycast-rime-manager", "backups"),
  );
}

async function ensureLowerFilter(installation: RimeInstallation, schema: RimeSchema): Promise<void> {
  await ensureLuaAsset(installation, LOWER_FILTER_LUA_NAME);
  const source = await readText(schema.customPath, "patch:\n");
  const next = replaceManagedPatchBlock(source, MANAGED_LOWER_FILTER_START, MANAGED_LOWER_FILTER_END, [
    '"engine/filters/@after last": "lua_filter@*raycast_restore_candidate_order_filter"',
  ]);
  await writeTextAtomically(
    schema.customPath,
    next,
    join(installation.userDataDir, ".raycast-rime-manager", "backups"),
  );
}

export async function saveBlockRules(
  installation: RimeInstallation,
  schema: RimeSchema,
  rules: BlockRule[],
): Promise<void> {
  if (rules.length > 0) await ensureBlockFilter(installation, schema);
  await writeTextAtomically(
    installation.blockedWordsPath,
    renderBlockRules(rules),
    join(installation.userDataDir, ".raycast-rime-manager", "backups"),
  );
}

export function createLowerRule(value: string, code: string): LowerRule {
  const normalizedValue = cleanCandidateText(value);
  const normalizedCode = cleanCode(code);
  if (!normalizedValue) throw new Error("Enter the candidate to demote.");
  if (!normalizedCode) throw new Error("Enter the input code that produces this candidate.");
  return { id: `lower-${Date.now()}`, value: normalizedValue, code: normalizedCode };
}

export async function saveLowerRules(
  installation: RimeInstallation,
  schema: RimeSchema,
  rules: LowerRule[],
): Promise<void> {
  if (rules.length > 0) await ensureLowerFilter(installation, schema);
  await writeTextAtomically(
    installation.loweredWordsPath,
    renderLowerRules(rules),
    join(installation.userDataDir, ".raycast-rime-manager", "backups"),
  );
}
