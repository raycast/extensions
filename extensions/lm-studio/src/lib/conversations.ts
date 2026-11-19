import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, open, readFile, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  Conversation,
  ConversationAttachment,
  ConversationSummary,
  ConversationTurn,
  GenerationSettings,
} from "../types";

export const CONVERSATION_STORAGE_VERSION = 1;
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

const DEFAULT_TITLE = "New Conversation";

interface StoredConversation {
  version: typeof CONVERSATION_STORAGE_VERSION;
  conversation: Conversation;
}

export interface NewConversationOptions {
  title?: string;
  settings: Partial<GenerationSettings> & Pick<GenerationSettings, "model">;
}

export interface NewTurnOptions {
  id?: string;
  parentId?: string | null;
  role: ConversationTurn["role"];
  content: string;
  reasoning?: string;
  attachments?: ConversationAttachment[];
  toolCalls?: ConversationTurn["toolCalls"];
  stats?: ConversationTurn["stats"];
  responseId?: string;
  model?: string;
  status?: ConversationTurn["status"];
  error?: string;
  createdAt?: string;
  chainVersion?: number;
}

export interface ConversationStoreOptions {
  /** Pass `environment.supportPath` from a Raycast command. */
  supportPath: string;
}

export interface ExportConversationOptions {
  includeReasoning?: boolean;
}

export type ConversationExportFormat = "markdown" | "json";

export class ConversationStorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ConversationStorageError";
  }
}

/**
 * File-backed conversation repository rooted under Raycast's support path.
 * Every conversation is a separate versioned file, so one corrupt transcript
 * cannot make the rest of the library unreadable.
 */
export class ConversationStore {
  readonly supportPath: string;
  readonly conversationsPath: string;
  readonly attachmentsPath: string;
  readonly exportsPath: string;

  constructor(options: string | ConversationStoreOptions) {
    const supportPath = typeof options === "string" ? options : options.supportPath;
    if (!supportPath.trim()) {
      throw new ConversationStorageError("Raycast support path is required.");
    }
    this.supportPath = path.resolve(supportPath);
    this.conversationsPath = path.join(this.supportPath, "conversations");
    this.attachmentsPath = path.join(this.supportPath, "attachments");
    this.exportsPath = path.join(this.supportPath, "exports");
  }

  async create(options: NewConversationOptions): Promise<Conversation> {
    const conversation = createConversation(options);
    return this.save(conversation);
  }

  async save(conversation: Conversation): Promise<Conversation> {
    validateSafeId(conversation.id, "Conversation");
    const updated = validateConversation({
      ...conversation,
      updatedAt: new Date().toISOString(),
    });
    await this.ensureDirectories();
    await atomicJsonWrite(this.filePath(updated.id), {
      version: CONVERSATION_STORAGE_VERSION,
      conversation: updated,
    } satisfies StoredConversation);
    return updated;
  }

  async get(id: string): Promise<Conversation | undefined> {
    validateSafeId(id, "Conversation");
    const file = this.filePath(id);
    try {
      return await readStoredConversation(file);
    } catch (error) {
      try {
        return await readStoredConversation(`${file}.bak`);
      } catch (backupError) {
        if (isMissingFileError(backupError)) {
          if (isMissingFileError(error)) return undefined;
          throw error;
        }
        throw new ConversationStorageError(`Conversation ${id} and its recovery copy could not be read.`, {
          primary: error,
          backup: backupError,
        });
      }
    }
  }

  async list(): Promise<ConversationSummary[]> {
    await this.ensureDirectories();
    const entries = await readdir(this.conversationsPath, {
      withFileTypes: true,
    });
    const ids = [
      ...new Set(
        entries.flatMap((entry) => {
          if (!entry.isFile()) return [];
          if (entry.name.endsWith(".json.bak")) {
            return [entry.name.slice(0, -".json.bak".length)];
          }
          if (entry.name.endsWith(".json")) {
            return [entry.name.slice(0, -".json".length)];
          }
          return [];
        }),
      ),
    ];
    const results = await Promise.allSettled(ids.map((id) => this.get(id)));

    return results
      .flatMap((result) => (result.status === "fulfilled" && result.value ? [summarizeConversation(result.value)] : []))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async delete(id: string): Promise<void> {
    validateSafeId(id, "Conversation");
    await Promise.all([
      unlinkIfPresent(this.filePath(id)),
      unlinkIfPresent(`${this.filePath(id)}.bak`),
      rm(path.join(this.attachmentsPath, id), { recursive: true, force: true }),
    ]);
  }

  async clear(): Promise<void> {
    await Promise.all([
      rm(this.conversationsPath, { recursive: true, force: true }),
      rm(this.attachmentsPath, { recursive: true, force: true }),
      rm(this.exportsPath, { recursive: true, force: true }),
    ]);
    await this.ensureDirectories();
  }

  async copyAttachments(conversationId: string, sourcePaths: string[]): Promise<ConversationAttachment[]> {
    validateSafeId(conversationId, "Conversation");
    if (sourcePaths.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new ConversationStorageError(`Choose at most ${MAX_ATTACHMENTS_PER_MESSAGE} images per message.`);
    }
    if (sourcePaths.length === 0) return [];

    const destinationDirectory = path.join(this.attachmentsPath, conversationId);
    await mkdir(destinationDirectory, { recursive: true });
    const copiedPaths: string[] = [];
    const temporaryPaths: string[] = [];
    try {
      const attachments: ConversationAttachment[] = [];
      for (const sourcePath of sourcePaths) {
        const source = path.resolve(sourcePath);
        const sourceStats = await stat(source);
        if (!sourceStats.isFile()) {
          throw new ConversationStorageError(`${path.basename(source)} is not a file.`);
        }
        if (sourceStats.size > MAX_ATTACHMENT_SIZE_BYTES) {
          throw new ConversationStorageError(`${path.basename(source)} is larger than the 10 MB attachment limit.`);
        }

        const image = await detectSupportedImage(source);
        const id = randomUUID();
        const destination = path.join(destinationDirectory, `${id}.${image.extension}`);
        const temporary = `${destination}.${randomUUID()}.tmp`;
        temporaryPaths.push(temporary);
        await copyFile(source, temporary);
        await rename(temporary, destination);
        temporaryPaths.splice(temporaryPaths.indexOf(temporary), 1);
        copiedPaths.push(destination);
        attachments.push({
          id,
          name: path.basename(source),
          path: destination,
          mimeType: image.mimeType,
          sizeBytes: sourceStats.size,
        });
      }
      return attachments;
    } catch (error) {
      await Promise.all([...copiedPaths, ...temporaryPaths].map(unlinkIfPresent));
      if (error instanceof ConversationStorageError) throw error;
      throw new ConversationStorageError("Could not copy image attachments.", error);
    }
  }

  async removeAttachments(attachments: ConversationAttachment[]): Promise<void> {
    await Promise.all(
      attachments.map(async (attachment) => {
        const resolved = path.resolve(attachment.path);
        if (!isPathInside(this.attachmentsPath, resolved)) {
          throw new ConversationStorageError("Refusing to remove an attachment outside the extension support folder.");
        }
        await unlinkIfPresent(resolved);
      }),
    );
  }

  async attachmentDataUrl(attachment: ConversationAttachment): Promise<string> {
    const resolved = path.resolve(attachment.path);
    if (!isPathInside(this.attachmentsPath, resolved)) {
      throw new ConversationStorageError("Refusing to read an attachment outside the extension support folder.");
    }
    const bytes = await readFile(resolved);
    if (bytes.byteLength > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new ConversationStorageError("Stored attachment exceeds the 10 MB limit.");
    }
    return `data:${attachment.mimeType};base64,${bytes.toString("base64")}`;
  }

  async exportConversation(
    id: string,
    format: ConversationExportFormat,
    options: ExportConversationOptions = {},
  ): Promise<string> {
    const conversation = await this.get(id);
    if (!conversation) throw new ConversationStorageError("Conversation was not found.");
    await this.ensureDirectories();

    const extension = format === "markdown" ? "md" : "json";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${safeFileName(conversation.title)}-${timestamp}.${extension}`;
    const destination = path.join(this.exportsPath, fileName);
    const content =
      format === "markdown"
        ? serializeConversationMarkdown(conversation, options)
        : serializeConversationJson(conversation);
    await atomicTextWrite(destination, content);
    return destination;
  }

  private filePath(id: string): string {
    return path.join(this.conversationsPath, `${id}.json`);
  }

  private async ensureDirectories(): Promise<void> {
    await Promise.all([
      mkdir(this.conversationsPath, { recursive: true }),
      mkdir(this.attachmentsPath, { recursive: true }),
      mkdir(this.exportsPath, { recursive: true }),
    ]);
  }
}

export function createConversation(options: NewConversationOptions): Conversation {
  const now = new Date().toISOString();
  return validateConversation({
    id: randomUUID(),
    title: normalizedTitle(options.title),
    createdAt: now,
    updatedAt: now,
    activeLeafId: null,
    chainVersion: 0,
    settings: {
      model: options.settings.model,
      systemPrompt: options.settings.systemPrompt ?? "You are a helpful assistant.",
      temperature: options.settings.temperature ?? 0.7,
      maxOutputTokens: options.settings.maxOutputTokens ?? 2048,
      ...(options.settings.reasoning === undefined ? {} : { reasoning: options.settings.reasoning }),
      showReasoning: options.settings.showReasoning ?? false,
      ...(options.settings.plugin ? { plugin: options.settings.plugin } : {}),
    },
    turns: [],
  });
}

export function summarizeConversation(conversation: Conversation): ConversationSummary {
  const branch = getActiveBranch(conversation);
  const preview =
    [...branch]
      .reverse()
      .find((turn) => turn.content.trim())
      ?.content.replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) ?? "";
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    model: conversation.settings.model,
    turnCount: branch.length,
    preview,
  };
}

export function getActiveBranch(conversation: Conversation): ConversationTurn[] {
  if (!conversation.activeLeafId) return [];
  const byId = new Map(conversation.turns.map((turn) => [turn.id, turn]));
  const visited = new Set<string>();
  const reversed: ConversationTurn[] = [];
  let currentId: string | null = conversation.activeLeafId;

  while (currentId) {
    if (visited.has(currentId)) {
      throw new ConversationStorageError("Conversation contains a cycle.");
    }
    visited.add(currentId);
    const turn = byId.get(currentId);
    if (!turn) {
      throw new ConversationStorageError(`Conversation references a missing turn: ${currentId}.`);
    }
    reversed.push(turn);
    currentId = turn.parentId;
  }
  return reversed.reverse();
}

export function appendTurn(conversation: Conversation, options: NewTurnOptions): Conversation {
  const id = options.id ?? randomUUID();
  validateSafeId(id, "Turn");
  if (conversation.turns.some((turn) => turn.id === id)) {
    throw new ConversationStorageError(`Turn ${id} already exists.`);
  }
  const parentId = options.parentId === undefined ? conversation.activeLeafId : options.parentId;
  if (parentId && !conversation.turns.some((turn) => turn.id === parentId)) {
    throw new ConversationStorageError(`Parent turn ${parentId} does not exist.`);
  }
  const turn: ConversationTurn = {
    id,
    parentId,
    role: options.role,
    content: options.content,
    ...(options.reasoning === undefined ? {} : { reasoning: options.reasoning }),
    ...(options.attachments ? { attachments: options.attachments } : {}),
    ...(options.toolCalls ? { toolCalls: options.toolCalls } : {}),
    ...(options.stats ? { stats: options.stats } : {}),
    ...(options.responseId ? { responseId: options.responseId } : {}),
    chainVersion: options.chainVersion ?? conversation.chainVersion,
    ...(options.model ? { model: options.model } : {}),
    status: options.status ?? "completed",
    ...(options.error ? { error: options.error } : {}),
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
  return validateConversation(
    touch({
      ...conversation,
      turns: [...conversation.turns, turn],
      activeLeafId: turn.id,
    }),
  );
}

/** Select an older point without deleting any branch history. */
export function branchFromTurn(conversation: Conversation, turnId: string | null): Conversation {
  if (turnId && !conversation.turns.some((turn) => turn.id === turnId)) {
    throw new ConversationStorageError(`Turn ${turnId} does not exist.`);
  }
  return validateConversation(touch({ ...conversation, activeLeafId: turnId }));
}

/**
 * Clone a turn at the same parent and select it. Existing descendants remain as
 * an alternate branch but disappear from the newly selected active branch.
 */
export function editTurn(
  conversation: Conversation,
  turnId: string,
  changes: Pick<ConversationTurn, "content"> & Partial<Pick<ConversationTurn, "attachments">>,
): Conversation {
  const original = requireTurnOnActiveBranch(conversation, turnId);
  const clone: NewTurnOptions = {
    role: original.role,
    parentId: original.parentId,
    content: changes.content,
    status: "completed",
    model: original.model,
    chainVersion: conversation.chainVersion,
  };
  const attachments = changes.attachments ?? original.attachments;
  if (attachments) clone.attachments = attachments;
  return appendTurn(conversation, clone);
}

export function regenerateAssistantTurn(conversation: Conversation, turnId: string): Conversation {
  const original = requireTurnOnActiveBranch(conversation, turnId);
  if (original.role !== "assistant") {
    throw new ConversationStorageError("Only assistant turns can be regenerated.");
  }
  return appendTurn(conversation, {
    role: "assistant",
    parentId: original.parentId,
    content: "",
    status: "pending",
    model: conversation.settings.model,
    chainVersion: conversation.chainVersion,
  });
}

/** Hide this turn and every descendant on the active branch. */
export function deleteTurnFromActiveBranch(conversation: Conversation, turnId: string): Conversation {
  const turn = requireTurnOnActiveBranch(conversation, turnId);
  return touch({ ...conversation, activeLeafId: turn.parentId });
}

export function renameConversation(conversation: Conversation, title: string): Conversation {
  return validateConversation(touch({ ...conversation, title: normalizedTitle(title) }));
}

export function updateGenerationSettings(
  conversation: Conversation,
  changes: Partial<GenerationSettings>,
): Conversation {
  const settings = { ...conversation.settings, ...changes };
  const resetsServerChain =
    settings.model !== conversation.settings.model || settings.systemPrompt !== conversation.settings.systemPrompt;
  return validateConversation(
    touch({
      ...conversation,
      settings,
      chainVersion: conversation.chainVersion + (resetsServerChain ? 1 : 0),
    }),
  );
}

/** Latest response ID that is safe to use as previous_response_id. */
export function getPreviousResponseId(conversation: Conversation): string | undefined {
  return [...getActiveBranch(conversation)]
    .reverse()
    .find((turn) => turn.role === "assistant" && turn.chainVersion === conversation.chainVersion && turn.responseId)
    ?.responseId;
}

export function serializeConversationMarkdown(
  conversation: Conversation,
  options: ExportConversationOptions = {},
): string {
  const lines = [
    `# ${conversation.title}`,
    "",
    `- Model: ${conversation.settings.model}`,
    `- Created: ${conversation.createdAt}`,
    `- Updated: ${conversation.updatedAt}`,
    "",
  ];

  for (const turn of getActiveBranch(conversation)) {
    lines.push(`## ${turn.role === "user" ? "You" : "Assistant"}`, "");
    if (turn.attachments?.length) {
      for (const attachment of turn.attachments) {
        lines.push(`- Attachment: ${attachment.name}`);
      }
      lines.push("");
    }
    lines.push(turn.content || (turn.status === "cancelled" ? "_Cancelled_" : ""), "");
    if (options.includeReasoning && turn.reasoning) {
      lines.push("<details>", "<summary>Reasoning</summary>", "", turn.reasoning, "", "</details>", "");
    }
    if (turn.toolCalls?.length) {
      lines.push("### Tool Calls", "");
      for (const call of turn.toolCalls) {
        lines.push(
          `- **${call.tool}**`,
          `  - Arguments: \`${inlineJson(call.arguments)}\``,
          `  - Result: ${call.output.replace(/\s+/g, " ").trim()}`,
        );
      }
      lines.push("");
    }
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function serializeConversationJson(conversation: Conversation): string {
  return `${JSON.stringify({ version: CONVERSATION_STORAGE_VERSION, conversation }, null, 2)}\n`;
}

export function conversationContentHash(conversation: Conversation): string {
  return createHash("sha256").update(serializeConversationJson(conversation)).digest("hex");
}

function requireTurnOnActiveBranch(conversation: Conversation, turnId: string): ConversationTurn {
  const turn = getActiveBranch(conversation).find((candidate) => candidate.id === turnId);
  if (!turn) {
    throw new ConversationStorageError(`Turn ${turnId} is not on the active branch.`);
  }
  return turn;
}

function touch(conversation: Conversation): Conversation {
  return { ...conversation, updatedAt: new Date().toISOString() };
}

function validateConversation(conversation: Conversation): Conversation {
  validateSafeId(conversation.id, "Conversation");
  if (typeof conversation.title !== "string" || !conversation.title.trim()) {
    throw new ConversationStorageError("Conversation title cannot be empty.");
  }
  if (
    !conversation.settings ||
    typeof conversation.settings.model !== "string" ||
    !conversation.settings.model.trim()
  ) {
    throw new ConversationStorageError("Conversation model cannot be empty.");
  }
  if (!Number.isInteger(conversation.chainVersion) || conversation.chainVersion < 0) {
    throw new ConversationStorageError("Conversation chain version is invalid.");
  }
  const ids = new Set<string>();
  for (const turn of conversation.turns) {
    validateSafeId(turn.id, "Turn");
    if (ids.has(turn.id)) {
      throw new ConversationStorageError(`Duplicate turn identifier: ${turn.id}.`);
    }
    ids.add(turn.id);
    if (turn.parentId !== null && typeof turn.parentId !== "string") {
      throw new ConversationStorageError(`Turn ${turn.id} has an invalid parent.`);
    }
    if (turn.role !== "user" && turn.role !== "assistant") {
      throw new ConversationStorageError(`Turn ${turn.id} has an invalid role.`);
    }
    if (
      turn.status !== "pending" &&
      turn.status !== "completed" &&
      turn.status !== "cancelled" &&
      turn.status !== "error"
    ) {
      throw new ConversationStorageError(`Turn ${turn.id} has an invalid status.`);
    }
  }
  for (const turn of conversation.turns) {
    if (turn.parentId && !ids.has(turn.parentId)) {
      throw new ConversationStorageError(`Missing parent turn: ${turn.parentId}.`);
    }
  }
  if (conversation.activeLeafId && !ids.has(conversation.activeLeafId)) {
    throw new ConversationStorageError("The active conversation branch is missing.");
  }
  const byId = new Map(conversation.turns.map((turn) => [turn.id, turn]));
  for (const turn of conversation.turns) {
    const lineage = new Set<string>();
    let current: ConversationTurn | undefined = turn;
    while (current) {
      if (lineage.has(current.id)) {
        throw new ConversationStorageError("Conversation contains a cycle.");
      }
      lineage.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }
  getActiveBranch(conversation);
  return conversation;
}

async function readStoredConversation(file: string): Promise<Conversation> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch (error) {
    if (isMissingFileError(error)) throw error;
    throw new ConversationStorageError(`Could not parse ${path.basename(file)}.`, error);
  }
  return validateConversation(migrateStoredConversation(parsed));
}

function migrateStoredConversation(value: unknown): Conversation {
  if (!isRecord(value)) {
    throw new ConversationStorageError("Stored conversation is not an object.");
  }
  let raw: unknown;
  if (typeof value.version === "number") {
    if (value.version > CONVERSATION_STORAGE_VERSION) {
      throw new ConversationStorageError(`Conversation uses unsupported storage version ${value.version}.`);
    }
    raw = value.conversation;
  } else {
    // Pre-versioned development builds wrote the conversation object directly.
    raw = value;
  }
  if (!isRecord(raw) || !Array.isArray(raw.turns) || !isRecord(raw.settings)) {
    throw new ConversationStorageError("Stored conversation is incomplete.");
  }

  const rawTurns = raw.turns;
  const turns = rawTurns.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new ConversationStorageError("Stored turn is invalid.");
    }
    const previous = index > 0 ? rawTurns[index - 1] : undefined;
    const previousId = isRecord(previous) && typeof previous.id === "string" ? previous.id : null;
    return {
      ...candidate,
      parentId: candidate.parentId === undefined ? previousId : (candidate.parentId as string | null),
      status: candidate.status ?? "completed",
      chainVersion: candidate.chainVersion ?? 0,
    } as unknown as ConversationTurn;
  });
  const lastTurn = turns.at(-1);
  return {
    ...raw,
    title: typeof raw.title === "string" ? raw.title : DEFAULT_TITLE,
    activeLeafId: raw.activeLeafId === undefined ? (lastTurn?.id ?? null) : (raw.activeLeafId as string | null),
    chainVersion: typeof raw.chainVersion === "number" ? raw.chainVersion : 0,
    settings: {
      ...raw.settings,
      systemPrompt:
        typeof raw.settings.systemPrompt === "string" ? raw.settings.systemPrompt : "You are a helpful assistant.",
      temperature: typeof raw.settings.temperature === "number" ? raw.settings.temperature : 0.7,
      maxOutputTokens: typeof raw.settings.maxOutputTokens === "number" ? raw.settings.maxOutputTokens : 2048,
      showReasoning: raw.settings.showReasoning === true,
    },
    turns,
  } as unknown as Conversation;
}

async function atomicJsonWrite(file: string, value: unknown): Promise<void> {
  await atomicTextWrite(file, `${JSON.stringify(value, null, 2)}\n`, true);
}

async function atomicTextWrite(file: string, content: string, keepBackup = false): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  const backupTemporary = `${file}.${randomUUID()}.bak.tmp`;
  await mkdir(path.dirname(file), { recursive: true });
  try {
    await writeFile(temporary, content, { encoding: "utf8", mode: 0o600 });
    if (keepBackup) {
      try {
        const existing = await readFile(file, "utf8");
        // Never replace a known-good recovery file with a corrupt primary.
        JSON.parse(existing);
        await writeFile(backupTemporary, existing, {
          encoding: "utf8",
          mode: 0o600,
        });
        await rename(backupTemporary, `${file}.bak`);
      } catch (error) {
        if (!isMissingFileError(error) && !(error instanceof SyntaxError)) {
          throw error;
        }
      }
    }
    await rename(temporary, file);
  } catch (error) {
    await Promise.all([unlinkIfPresent(temporary), unlinkIfPresent(backupTemporary)]);
    throw new ConversationStorageError(`Could not write ${path.basename(file)}.`, error);
  } finally {
    await unlinkIfPresent(backupTemporary);
  }
}

async function detectSupportedImage(file: string): Promise<{
  extension: "jpg" | "png" | "webp";
  mimeType: ConversationAttachment["mimeType"];
}> {
  const handle = await open(file, "r");
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return { extension: "jpg", mimeType: "image/jpeg" };
    }
    if (bytesRead >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { extension: "png", mimeType: "image/png" };
    }
    if (
      bytesRead >= 12 &&
      header.subarray(0, 4).toString("ascii") === "RIFF" &&
      header.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return { extension: "webp", mimeType: "image/webp" };
    }
  } finally {
    await handle.close();
  }
  throw new ConversationStorageError(`${path.basename(file)} is not a supported JPEG, PNG, or WebP image.`);
}

function normalizedTitle(title?: string): string {
  const normalized = title?.replace(/\s+/g, " ").trim() || DEFAULT_TITLE;
  return normalized.slice(0, 120);
}

function safeFileName(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "conversation"
  );
}

function validateSafeId(id: string, label: string): void {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new ConversationStorageError(`${label} identifier is invalid.`);
  }
}

function isPathInside(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

async function unlinkIfPresent(file: string): Promise<void> {
  try {
    await unlink(file);
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }
}

function inlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/`/g, "\\`");
}
