import { createHash, randomUUID } from "node:crypto";
import { execute, listTools } from "./client";
import { executionOutput, parseArgumentsJson, type ConfirmationDetails } from "./ai-tools";
import { toolCallCode } from "./execution";
import { toolLabel } from "./format";
import { loadSavedTools, removeSavedTool, saveTool, type SavedTool } from "./saved-tools";
import type { ToolSummary } from "./types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export interface SavedToolIdInput {
  savedToolId: string;
}

export interface StableSavedToolInput extends SavedToolIdInput {
  /** Fingerprint returned by list-saved-tools or get-saved-tool for this exact saved state. */
  savedToolFingerprint: string;
}

export interface ListSavedToolsInput {
  limit?: number;
  offset?: number;
}

export interface SaveFavoriteInput {
  address: string;
  title?: string;
}

export interface SavePresetInput {
  address: string;
  title: string;
  argumentsJson: string;
}

export interface UpdateSavedToolInput extends StableSavedToolInput {
  title?: string;
  argumentsJson?: string;
}

function nonEmpty(value: string | undefined, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

function limit(value: number | undefined): number {
  if (value === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(value) || value < 1) throw new Error("Limit must be a positive whole number.");
  return Math.min(value, MAX_LIMIT);
}

function offset(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isInteger(value) || value < 0) throw new Error("Offset must be a non-negative whole number.");
  return value;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

export function savedToolFingerprint(item: SavedTool): string {
  return createHash("sha256")
    .update(
      canonicalJson({
        id: item.id,
        title: item.title,
        toolAddress: item.tool.address,
        args: item.args,
      }),
    )
    .digest("hex");
}

function summary(item: SavedTool) {
  return {
    id: item.id,
    savedToolFingerprint: savedToolFingerprint(item),
    title: item.title,
    kind: item.args ? ("preset" as const) : ("favorite" as const),
    tool: item.tool,
    ...(item.args ? { arguments: item.args } : {}),
  };
}

async function exactSavedTool(savedToolId: string): Promise<SavedTool> {
  const id = nonEmpty(savedToolId, "Saved tool ID");
  const matches = (await loadSavedTools()).filter((item) => item.id === id);
  if (matches.length !== 1) throw new Error("The exact saved tool was not found. List saved tools again.");
  return matches[0];
}

async function stableSavedTool(input: StableSavedToolInput): Promise<SavedTool> {
  const expected = nonEmpty(input.savedToolFingerprint, "Saved tool fingerprint");
  const item = await exactSavedTool(input.savedToolId);
  if (savedToolFingerprint(item) !== expected) {
    throw new Error("This saved tool changed. List or get it again and review its current state before continuing.");
  }
  return item;
}

async function exactTool(addressValue: string): Promise<ToolSummary> {
  const address = nonEmpty(addressValue, "Tool address").replace(/^tools\./, "");
  const matches = (await listTools({ query: address })).filter(
    (tool) => tool.address === address || tool.address === `tools.${address}`,
  );
  if (matches.length !== 1) throw new Error("The exact tool address was not found. Discover tools again.");
  return matches[0];
}

export async function listExecutorSavedTools(input: ListSavedToolsInput) {
  const all = (await loadSavedTools()).map(summary);
  const start = offset(input.offset);
  const selected = all.slice(start, start + limit(input.limit));
  const nextOffset = start + selected.length < all.length ? start + selected.length : undefined;
  return {
    returned: selected.length,
    totalMatched: all.length,
    offset: start,
    nextOffset,
    truncated: nextOffset !== undefined,
    savedTools: selected,
  };
}

export async function getExecutorSavedTool(input: SavedToolIdInput) {
  return { savedTool: summary(await exactSavedTool(input.savedToolId)) };
}

export async function saveFavoriteConfirmation(input: SaveFavoriteInput): Promise<ConfirmationDetails> {
  const tool = await exactTool(input.address);
  return {
    message: "Save this exact Executor tool as a local favorite?",
    info: [
      { name: "Tool", value: tool.address },
      { name: "Title", value: input.title?.trim() || toolLabel(tool.name) },
    ],
  };
}

export async function saveExecutorFavorite(input: SaveFavoriteInput) {
  const tool = await exactTool(input.address);
  const item = { id: tool.address, title: input.title?.trim() || toolLabel(tool.name), tool };
  await saveTool(item);
  return { savedTool: summary(item) };
}

export async function savePresetConfirmation(input: SavePresetInput): Promise<ConfirmationDetails> {
  const tool = await exactTool(input.address);
  const title = nonEmpty(input.title, "Preset title");
  const args = parseArgumentsJson(input.argumentsJson);
  return {
    message: "Save these inputs as a local Executor preset?",
    info: [
      { name: "Tool", value: tool.address },
      { name: "Title", value: title },
      { name: "Arguments", value: JSON.stringify(args, null, 2) },
    ],
  };
}

export async function saveExecutorPreset(input: SavePresetInput) {
  const tool = await exactTool(input.address);
  const item = {
    id: randomUUID(),
    title: nonEmpty(input.title, "Preset title"),
    tool,
    args: parseArgumentsJson(input.argumentsJson),
  };
  await saveTool(item);
  return { savedTool: summary(item) };
}

async function savedToolUpdate(input: UpdateSavedToolInput) {
  const existing = await stableSavedTool(input);
  if (input.title === undefined && input.argumentsJson === undefined) {
    throw new Error("Provide a new title or arguments.");
  }
  if (!existing.args && input.argumentsJson !== undefined) {
    throw new Error("Favorites cannot store inputs. Save a preset with inputs instead.");
  }
  return {
    existing,
    updated: {
      ...existing,
      title: input.title === undefined ? existing.title : nonEmpty(input.title, "Preset title"),
      args: input.argumentsJson === undefined ? existing.args : parseArgumentsJson(input.argumentsJson),
    },
  };
}

export async function updateSavedToolConfirmation(input: UpdateSavedToolInput): Promise<ConfirmationDetails> {
  const { existing, updated } = await savedToolUpdate(input);
  return {
    message: "Update this exact local Executor favorite or preset?",
    info: [
      { name: "Saved Tool ID", value: existing.id },
      { name: "Tool", value: existing.tool.address },
      { name: "Current Title", value: existing.title },
      { name: "New Title", value: updated.title },
      ...(updated.args ? [{ name: "New Arguments", value: JSON.stringify(updated.args, null, 2) }] : []),
    ],
  };
}

export async function updateExecutorSavedTool(input: UpdateSavedToolInput) {
  const { updated } = await savedToolUpdate(input);
  await saveTool(updated);
  return { savedTool: summary(updated) };
}

export async function removeSavedToolConfirmation(input: StableSavedToolInput): Promise<ConfirmationDetails> {
  const item = await stableSavedTool(input);
  return {
    message: "Remove this exact local Executor favorite or preset?",
    info: [
      { name: "Saved Tool ID", value: item.id },
      { name: "Title", value: item.title },
      { name: "Tool", value: item.tool.address },
    ],
  };
}

export async function removeExecutorSavedTool(input: StableSavedToolInput) {
  const item = await stableSavedTool(input);
  await removeSavedTool(item.id);
  return { removed: true, savedTool: { id: item.id, title: item.title, toolAddress: item.tool.address } };
}

export async function executeSavedToolConfirmation(input: StableSavedToolInput): Promise<ConfirmationDetails> {
  const item = await stableSavedTool(input);
  if (!item.args)
    throw new Error("This saved item is a favorite without inputs. Use call-tool with reviewed arguments.");
  return {
    message:
      "Run this exact saved preset through Executor? Executor may apply an additional server-side approval gate.",
    info: [
      { name: "Saved Tool ID", value: item.id },
      { name: "Tool", value: item.tool.address },
      { name: "Arguments", value: JSON.stringify(item.args, null, 2) },
    ],
  };
}

export async function executeExecutorSavedTool(input: StableSavedToolInput & { includeFullResponse?: boolean }) {
  const item = await stableSavedTool(input);
  if (!item.args)
    throw new Error("This saved item is a favorite without inputs. Use call-tool with reviewed arguments.");
  return executionOutput(await execute(toolCallCode(item.tool.address, item.args)), input.includeFullResponse);
}
