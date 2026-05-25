/* eslint-disable @typescript-eslint/strict-boolean-expressions -- Codex JSONL の unknown 形状を移動前と同じ条件で判定する */
import { sep } from "node:path";

import { expandHomePath, normalizePathValue } from "./path-utils";

/**
 * Codex セッションの表示分類値
 */
const SESSION_KIND_VALUES = ["main", "subagent", "review", "reviewSubagent", "autoReview"] as const;

/**
 * Codex セッションの表示分類
 */
export type SessionKind = (typeof SESSION_KIND_VALUES)[number];

/**
 * Codex セッションの進行状態
 */
export type SessionStatus = "working" | "done";

/**
 * セッションメッセージのロール
 */
export type SessionMessageRole = "user" | "assistant";

/**
 * セッション詳細表示用のメッセージ
 */
export type SessionMessage = {
  role: SessionMessageRole;
  text: string;
  timestamp: string | null;
};

/**
 * セッション内で検出したスキル使用
 */
export type SessionSkillUsage = {
  name: string;
  timestamp: string | null;
};

/**
 * セッションログ解析の途中状態
 */
export type SessionParseState = {
  cwds: Set<string>;
  firstEventUserMessage: string | null;
  firstEventUserTurnId: string | null;
  firstEventUserTimestamp: string | null;
  goalObjectiveMessage: string | null;
  goalObjectiveTimestamp: string | null;
  latestEventMessage: { role: "user" | "agent"; message: string } | null;
  latestStatus: SessionStatus | null;
  isInReviewMode: boolean;
  sessionKind: SessionKind;
  sessionThreadId: string | null;
  parentThreadId: string | null;
  reviewTurnIds: Set<string>;
  currentTurnId: string | null;
  waitingForUserCallIds: Set<string>;
  skillUsages: SessionSkillUsage[];
};

/**
 * セッションログ解析の完了結果
 */
export type ParsedSessionLog = {
  title: string | null;
  titleTurnId: string | null;
  cwds: string[];
  status: SessionStatus | null;
  latestMessage: string | null;
  startedAt: number | null;
  sessionKind: SessionKind;
  sessionThreadId: string | null;
  parentThreadId: string | null;
  reviewTurnIds: string[];
  isWaitingForUser: boolean;
  skillUsages: SessionSkillUsage[];
};

/**
 * パスマッチ用の正規化済みエントリ
 */
type SessionPathEntry = {
  path: string;
  normalized: string;
};

/**
 * review 親子重複判定に必要なセッションエントリ
 */
export type ReviewParentDedupeEntry = {
  updatedAt: number;
  sessionPath: string | undefined;
  sessionKind: SessionKind;
  reviewTurnIds: string[];
  titleTurnId: string | null;
};

/**
 * メッセージ本文から cwd を取り出すパターン
 */
const CWD_PATTERN = /<cwd>([^<]+)<\/cwd>/g;

/**
 * タイトルとして表示する最大文字数
 */
const TITLE_MAX_LENGTH_CHARS = 60;

/**
 * 同一スキル使用を隣接重複としてまとめる時間幅
 */
const SKILL_USAGE_DEDUPE_WINDOW_MS = 2 * 60 * 1000;

/**
 * SKILL.md 読み込み command からスキル名を取り出すパターン
 */
const SKILL_FILE_PATH_PATTERN = /\/skills\/(?:\.[^/\s]+\/)?([^/\s]+)\/SKILL\.md\b/;

/**
 * 英語のスキル使用宣言からスキル名を取り出すパターン
 */
const ENGLISH_SKILL_USAGE_PATTERN = /(?:^|\n)\s*Using (?:the )?([A-Za-z0-9][A-Za-z0-9:_./ -]{0,80}?) skill\b/i;

/**
 * 日本語のスキル使用宣言からスキル名を取り出すパターン
 */
const JAPANESE_SKILL_USAGE_PATTERN = /(?:^|\n)\s*([A-Za-z0-9][A-Za-z0-9:_./ -]{0,80}?)\s*スキル(?:で|を|として|に|$)/;

/**
 * 日本語の直接的なスキル使用宣言からスキル名を取り出すパターン
 */
const JAPANESE_DIRECT_SKILL_USAGE_PATTERN = /(?:^|\n)\s*([A-Za-z0-9][A-Za-z0-9:_./-]{0,80}?)\s*を使います(?:。|\.|$)/;

/**
 * Codex が注入する skill ブロックからスキル本文を取り出すパターン
 */
const USER_SKILL_BLOCK_PATTERN = /<skill>\s*([\s\S]*?)\s*<\/skill>/g;

/**
 * Codex が注入する skill ブロック本文からスキル名を取り出すパターン
 */
const USER_SKILL_NAME_PATTERN = /<name>\s*([^<]+?)\s*<\/name>/;

/**
 * 指示メッセージ判定用の文字列
 */
const USER_INSTRUCTION_MARKERS = ["<INSTRUCTIONS>", "AGENTS.md instructions", "AGENTS.override.md instructions"];

/**
 * 環境情報メッセージ判定用の文字列
 */
const USER_CONTEXT_MARKERS = ["<environment_context>", "</environment_context>"];

/**
 * ユーザー中断メッセージ判定用の文字列
 */
const USER_TURN_ABORTED_MARKERS = ["<turn_aborted>", "</turn_aborted>"];

/**
 * turn_aborted の専用メッセージ全体判定
 */
const USER_TURN_ABORTED_BLOCK_PATTERN = /^\s*<turn_aborted>[\s\S]*<\/turn_aborted>\s*$/;

/**
 * goal 継続メッセージを判定する文字列
 */
const GOAL_CONTINUATION_MARKER = "Continue working toward the active thread goal";

/**
 * goal objective ブロックを抽出するパターン
 */
const GOAL_OBJECTIVE_PATTERN = /<untrusted_objective>\s*([\s\S]*?)\s*<\/untrusted_objective>/;

/**
 * review 親セッション重複除外の許容時間差（ミリ秒）
 */
const REVIEW_PARENT_DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

/**
 * セッション解析状態を初期化する
 */
function createParseState(): SessionParseState {
  return {
    cwds: new Set<string>(),
    firstEventUserMessage: null,
    firstEventUserTurnId: null,
    firstEventUserTimestamp: null,
    goalObjectiveMessage: null,
    goalObjectiveTimestamp: null,
    latestEventMessage: null,
    latestStatus: null,
    isInReviewMode: false,
    sessionKind: "main",
    sessionThreadId: null,
    parentThreadId: null,
    reviewTurnIds: new Set<string>(),
    currentTurnId: null,
    waitingForUserCallIds: new Set<string>(),
    skillUsages: [],
  };
}

/**
 * cwd 文字列を整形して正規化する
 */
function normalizeCwd(raw: string, homeDir: string | null): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const expanded = expandHomePath(trimmed, homeDir);
  return normalizePathValue(expanded);
}

/**
 * テキストから cwd 候補を抽出する
 */
function extractCwdsFromText(text: string, homeDir: string | null): string[] {
  const results: string[] = [];
  CWD_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(CWD_PATTERN)) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }
    const normalized = normalizeCwd(raw, homeDir);
    if (normalized) {
      results.push(normalized);
    }
  }
  return results;
}

/**
 * ログエントリから cwd 候補を抽出する
 */
function extractCwdsFromLog(value: Record<string, unknown>, homeDir: string | null): string[] {
  const results: string[] = [];
  if (value.type === "turn_context" || value.type === "session_meta") {
    const payload = value.payload;
    if (!payload || typeof payload !== "object") {
      return results;
    }
    const payloadValue = payload as Record<string, unknown>;
    if (typeof payloadValue.cwd !== "string") {
      return results;
    }
    const normalized = normalizeCwd(payloadValue.cwd, homeDir);
    if (normalized) {
      results.push(normalized);
    }
    return results;
  }

  if (value.type === "response_item") {
    const payload = value.payload;
    if (!payload || typeof payload !== "object") {
      return results;
    }
    const payloadValue = payload as Record<string, unknown>;
    if (payloadValue.type !== "message" || payloadValue.role !== "user") {
      return results;
    }
    const content = payloadValue.content;
    if (!Array.isArray(content)) {
      return results;
    }
    for (const item of content) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const entry = item as Record<string, unknown>;
      if (entry.type !== "input_text" || typeof entry.text !== "string") {
        continue;
      }
      results.push(...extractCwdsFromText(entry.text, homeDir));
    }
    return results;
  }

  if (value.type === "event_msg") {
    const payload = value.payload;
    if (!payload || typeof payload !== "object") {
      return results;
    }
    const payloadValue = payload as Record<string, unknown>;
    if (payloadValue.type !== "user_message" || typeof payloadValue.message !== "string") {
      return results;
    }
    results.push(...extractCwdsFromText(payloadValue.message, homeDir));
  }
  return results;
}

/**
 * event_msg から role と message を抽出する
 */
function extractEventMessage(value: Record<string, unknown>): { role: "user" | "agent"; message: string } | null {
  if (value.type !== "event_msg") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  if (payloadValue.type !== "user_message" && payloadValue.type !== "agent_message") {
    return null;
  }
  if (typeof payloadValue.message !== "string") {
    return null;
  }
  return {
    role: payloadValue.type === "user_message" ? "user" : "agent",
    message: payloadValue.message,
  };
}

/**
 * event_msg からイベント種別を抽出する
 */
function extractEventType(value: Record<string, unknown>): string | null {
  if (value.type !== "event_msg") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  return typeof payloadValue.type === "string" ? payloadValue.type : null;
}

/**
 * event_msg / turn_context から turn_id を抽出する
 */
function extractTurnId(value: Record<string, unknown>): string | null {
  if (value.type !== "event_msg" && value.type !== "turn_context") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  if (typeof payloadValue.turn_id !== "string") {
    return null;
  }
  const turnId = payloadValue.turn_id.trim();
  return turnId || null;
}

/**
 * session_meta から source を抽出する
 */
function extractSessionSource(value: Record<string, unknown>): unknown | null {
  if (value.type !== "session_meta") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  return "source" in payloadValue ? payloadValue.source : null;
}

/**
 * session_meta からセッション自身の thread id を抽出する
 */
function extractSessionThreadId(value: Record<string, unknown>): string | null {
  if (value.type !== "session_meta") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  return typeof payloadValue.id === "string" ? payloadValue.id.trim() || null : null;
}

/**
 * turn_context から model 名を抽出する
 */
function extractTurnContextModel(value: Record<string, unknown>): string | null {
  if (value.type !== "turn_context") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  return typeof payloadValue.model === "string" ? payloadValue.model.trim() || null : null;
}

/**
 * セッション種別を優先順位つきで更新する
 */
function applySessionKind(state: SessionParseState, sessionKind: SessionKind): void {
  if (state.sessionKind === "autoReview") {
    return;
  }
  if (sessionKind === "autoReview") {
    state.sessionKind = "autoReview";
    return;
  }
  if (state.sessionKind === "reviewSubagent") {
    return;
  }
  if (sessionKind === "reviewSubagent") {
    state.sessionKind = "reviewSubagent";
    return;
  }
  if (state.sessionKind === "subagent" && sessionKind === "review") {
    state.sessionKind = "reviewSubagent";
    return;
  }
  if (state.sessionKind === "review" && sessionKind === "subagent") {
    state.sessionKind = "reviewSubagent";
    return;
  }
  if (state.sessionKind === "main") {
    state.sessionKind = sessionKind;
  }
}

/**
 * source.subagent.thread_spawn から親 thread id を抽出する
 */
function extractParentThreadIdFromSource(source: unknown): string | null {
  if (!source || typeof source !== "object") {
    return null;
  }
  const value = source as Record<string, unknown>;
  const subagent = value.subagent;
  if (!subagent || typeof subagent !== "object") {
    return null;
  }
  const subagentValue = subagent as Record<string, unknown>;
  const threadSpawn = subagentValue.thread_spawn;
  if (!threadSpawn || typeof threadSpawn !== "object") {
    return null;
  }
  const threadSpawnValue = threadSpawn as Record<string, unknown>;
  return typeof threadSpawnValue.parent_thread_id === "string"
    ? threadSpawnValue.parent_thread_id.trim() || null
    : null;
}

/**
 * session_meta の source からセッション種別を判定する
 */
function resolveSessionKindFromSource(source: unknown): SessionKind | null {
  if (typeof source === "string") {
    return source.trim().toLowerCase() === "subagent" ? "subagent" : null;
  }
  if (!source || typeof source !== "object") {
    return null;
  }
  const value = source as Record<string, unknown>;
  if (typeof value.subagent === "string" && value.subagent.trim().length > 0) {
    return value.subagent.trim().toLowerCase() === "review" ? "reviewSubagent" : "subagent";
  }
  if (value.subagent && typeof value.subagent === "object") {
    const subagentValue = value.subagent as Record<string, unknown>;
    if (typeof subagentValue.other === "string" && subagentValue.other.trim().toLowerCase() === "guardian") {
      return "autoReview";
    }
  }
  if (typeof value.type === "string" && value.type.trim().toLowerCase() === "subagent") {
    return "subagent";
  }
  if (!value.subagent || typeof value.subagent !== "object") {
    return null;
  }
  // guardian 以外の object subagent は一覧から除外する通常 subagent として扱う
  return "subagent";
}

/**
 * unknown 値が SessionKind か判定する
 */
function isSessionKind(value: unknown): value is SessionKind {
  return typeof value === "string" && (SESSION_KIND_VALUES as readonly string[]).includes(value);
}

/**
 * response_item から role と text を抽出する
 */
function extractResponseMessage(
  value: Record<string, unknown>,
): { role: string; text: string; phase: "commentary" | "final_answer" | null } | null {
  if (value.type !== "response_item") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  if (payloadValue.type !== "message" || typeof payloadValue.role !== "string") {
    return null;
  }
  const content = payloadValue.content;
  if (!Array.isArray(content)) {
    return null;
  }
  const texts: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const entry = item as Record<string, unknown>;
    if (typeof entry.type !== "string" || typeof entry.text !== "string") {
      continue;
    }
    if (entry.type === "input_text" || entry.type === "output_text") {
      texts.push(entry.text);
    }
  }
  if (texts.length === 0) {
    return null;
  }
  const phase = payloadValue.phase;
  const resolvedPhase = phase === "commentary" || phase === "final_answer" ? phase : null;
  return { role: payloadValue.role, text: texts.join(""), phase: resolvedPhase };
}

/**
 * developer メッセージから goal objective を抽出する
 */
function extractGoalObjectiveFromDeveloperMessage(message: { role: string; text: string } | null): string | null {
  if (message?.role !== "developer") {
    return null;
  }
  if (!message.text.includes(GOAL_CONTINUATION_MARKER)) {
    return null;
  }
  const match = message.text.match(GOAL_OBJECTIVE_PATTERN);
  const objective = match?.[1]?.trim();
  return objective || null;
}

/**
 * response_item から type を抽出する
 */
function extractResponseItemType(value: Record<string, unknown>): string | null {
  if (value.type !== "response_item") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  return typeof payloadValue.type === "string" ? payloadValue.type : null;
}

/**
 * response_item から call_id を抽出する
 */
function extractResponseItemCallId(value: Record<string, unknown>): string | null {
  if (value.type !== "response_item") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  const callId = payloadValue.call_id;
  return typeof callId === "string" && callId.trim() ? callId : null;
}

/**
 * JSON 文字列の arguments をオブジェクトとして読む
 */
function parseFunctionCallArguments(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * 表示・重複判定に使うスキル名を整形する
 */
function normalizeSkillName(value: string): string | null {
  const trimmed = value
    .trim()
    .replace(/^the\s+/i, "")
    .replace(/^`+|`+$/g, "")
    .trim();
  if (!trimmed || trimmed.length > 80) {
    return null;
  }
  return trimmed;
}

/**
 * スキル名の重複判定キーを作る
 */
function buildSkillNameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * スキル使用時刻をミリ秒に変換する
 */
function parseSkillUsageTimestamp(value: string | null): number | null {
  const parsed = parseLogTimestampToMs(value);
  return parsed == null ? null : parsed;
}

/**
 * 近接した同一スキル使用か判定する
 */
function isDuplicateSkillUsage(left: SessionSkillUsage, right: SessionSkillUsage): boolean {
  if (buildSkillNameKey(left.name) !== buildSkillNameKey(right.name)) {
    return false;
  }
  const leftMs = parseSkillUsageTimestamp(left.timestamp);
  const rightMs = parseSkillUsageTimestamp(right.timestamp);
  if (leftMs == null || rightMs == null) {
    return true;
  }
  return Math.abs(rightMs - leftMs) <= SKILL_USAGE_DEDUPE_WINDOW_MS;
}

/**
 * 解析状態へスキル使用を追加する
 */
function addSkillUsage(state: SessionParseState, usage: SessionSkillUsage | null): void {
  if (!usage) {
    return;
  }
  const latest = state.skillUsages.at(-1);
  if (latest && isDuplicateSkillUsage(latest, usage)) {
    return;
  }
  state.skillUsages.push(usage);
}

/**
 * スキル使用履歴を単調増加データとして統合する
 */
function mergeSessionSkillUsages(...groups: SessionSkillUsage[][]): SessionSkillUsage[] {
  const merged: SessionSkillUsage[] = [];
  for (const usage of groups.flat()) {
    if (merged.some((existing) => isDuplicateSkillUsage(existing, usage))) {
      continue;
    }
    merged.push(usage);
  }
  return merged;
}

/**
 * function_call からスキル使用を抽出する
 */
function extractSkillUsageFromFunctionCall(
  value: Record<string, unknown>,
  timestamp: string | null,
): SessionSkillUsage | null {
  if (value.type !== "response_item") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  if (payloadValue.type !== "function_call") {
    return null;
  }
  const args = parseFunctionCallArguments(payloadValue.arguments);
  const command = typeof args?.cmd === "string" ? args.cmd : "";
  const match = command.match(SKILL_FILE_PATH_PATTERN);
  const name = match?.[1] ? normalizeSkillName(match[1]) : null;
  return name ? { name, timestamp } : null;
}

/**
 * assistant の commentary からスキル使用を抽出する
 */
function extractSkillUsageFromAssistantText(text: string, timestamp: string | null): SessionSkillUsage | null {
  const englishMatch = text.match(ENGLISH_SKILL_USAGE_PATTERN);
  const japaneseMatch = text.match(JAPANESE_SKILL_USAGE_PATTERN);
  const japaneseDirectMatch = text.match(JAPANESE_DIRECT_SKILL_USAGE_PATTERN);
  const name = normalizeSkillName(englishMatch?.[1] ?? japaneseMatch?.[1] ?? japaneseDirectMatch?.[1] ?? "");
  return name ? { name, timestamp } : null;
}

/**
 * user message の skill ブロックからスキル使用を抽出する
 */
function extractSkillUsagesFromUserText(text: string, timestamp: string | null): SessionSkillUsage[] {
  const usages: SessionSkillUsage[] = [];
  USER_SKILL_BLOCK_PATTERN.lastIndex = 0;
  for (const blockMatch of text.matchAll(USER_SKILL_BLOCK_PATTERN)) {
    const block = blockMatch[1] ?? "";
    const name = normalizeSkillName(block.match(USER_SKILL_NAME_PATTERN)?.[1] ?? "");
    if (name) {
      usages.push({ name, timestamp });
    }
  }
  return usages;
}

/**
 * セッションログ1行からスキル使用履歴だけを抽出する
 */
function extractSkillUsagesFromLogLine(line: string): SessionSkillUsage[] {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const timestamp = extractLogTimestamp(parsed);
    const usages: SessionSkillUsage[] = [];
    const functionCallUsage = extractSkillUsageFromFunctionCall(parsed, timestamp);
    if (functionCallUsage) {
      usages.push(functionCallUsage);
    }
    const eventMessage = extractEventMessage(parsed);
    if (eventMessage?.role === "agent") {
      const eventUsage = extractSkillUsageFromAssistantText(eventMessage.message, timestamp);
      if (eventUsage) {
        usages.push(eventUsage);
      }
    }
    const responseMessage = extractResponseMessage(parsed);
    if (responseMessage?.role === "user") {
      usages.push(...extractSkillUsagesFromUserText(responseMessage.text, timestamp));
    }
    if (responseMessage?.role === "assistant" && responseMessage.phase === "commentary") {
      const responseUsage = extractSkillUsageFromAssistantText(responseMessage.text, timestamp);
      if (responseUsage) {
        usages.push(responseUsage);
      }
    }
    return mergeSessionSkillUsages(usages);
  } catch {
    return [];
  }
}

/**
 * function_call がプラグイン呼び出しか判定する
 */
function isPluginFunctionCallPayload(payload: Record<string, unknown>): boolean {
  const namespace = payload.namespace;
  return typeof namespace === "string" && namespace.trim().startsWith("mcp__");
}

/**
 * function_call がユーザー入力待ちを発生させるか判定する
 */
function isWaitingForUserFunctionCallPayload(payload: Record<string, unknown>): boolean {
  const name = typeof payload.name === "string" ? payload.name : "";
  if (name === "request_user_input") {
    return true;
  }
  if (isPluginFunctionCallPayload(payload)) {
    return true;
  }
  const args = parseFunctionCallArguments(payload.arguments);
  return args?.sandbox_permissions === "require_escalated";
}

/**
 * response_item からユーザー待ち call_id を抽出する
 */
function extractWaitingForUserCallId(value: Record<string, unknown>): string | null {
  if (value.type !== "response_item") {
    return null;
  }
  const payload = value.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const payloadValue = payload as Record<string, unknown>;
  if (payloadValue.type !== "function_call") {
    return null;
  }
  const callId = extractResponseItemCallId(value);
  if (!callId) {
    return null;
  }
  return isWaitingForUserFunctionCallPayload(payloadValue) ? callId : null;
}

/**
 * response_item の type が作業中判定対象か判定する
 */
function isWorkingResponseItemType(type: string): boolean {
  return type.endsWith("_call") || type.endsWith("_call_output");
}

/**
 * ログエントリの type を抽出する
 */
function extractLogEntryType(value: Record<string, unknown>): string | null {
  const type = value.type;
  return typeof type === "string" ? type : null;
}

/**
 * response ライフサイクルイベントからステータスを判定する
 */
function resolveResponseLifecycleStatus(type: string): SessionStatus | null {
  if (type === "response.completed") {
    return "done";
  }
  if (type === "response.failed" || type === "response.incomplete") {
    return "done";
  }
  if (type.startsWith("response.")) {
    return "working";
  }
  return null;
}

/**
 * review モードイベントからステータスを判定する
 */
function resolveReviewLifecycleStatus(eventType: string | null): SessionStatus | null {
  if (eventType === "entered_review_mode") {
    return "working";
  }
  if (eventType === "exited_review_mode") {
    return "done";
  }
  return null;
}

/**
 * 通常セッションの要素からステータスを更新する
 */
function applyNormalSessionStatus(args: {
  state: SessionParseState;
  responseLifecycleType: string | null;
  responseLifecycleStatus: SessionStatus | null;
  eventMessage: { role: "user" | "agent"; message: string } | null;
  responseMessage: { role: string; text: string; phase: "commentary" | "final_answer" | null } | null;
  responseItemType: string | null;
  responseItemCallId: string | null;
  waitingForUserCallId: string | null;
  eventType: string | null;
}): void {
  const {
    state,
    responseLifecycleType,
    responseLifecycleStatus,
    eventMessage,
    responseMessage,
    responseItemType,
    responseItemCallId,
    waitingForUserCallId,
    eventType,
  } = args;
  if (responseLifecycleStatus) {
    state.latestStatus =
      state.isInReviewMode && responseLifecycleType === "response.completed" ? "working" : responseLifecycleStatus;
  }
  if (eventMessage?.role === "user") {
    state.latestStatus = "working";
    state.waitingForUserCallIds.clear();
  }
  if (responseMessage) {
    if (responseMessage.role === "user") {
      state.latestStatus = "working";
      state.waitingForUserCallIds.clear();
    } else if (responseMessage.role === "assistant") {
      if (state.isInReviewMode) {
        state.latestStatus = "working";
      } else if (responseMessage.phase === "final_answer") {
        state.latestStatus = "done";
        state.waitingForUserCallIds.clear();
      } else if (responseMessage.phase === "commentary") {
        state.latestStatus = "working";
      }
    }
  }
  if (responseItemType && isWorkingResponseItemType(responseItemType)) {
    state.latestStatus = "working";
  }
  if (waitingForUserCallId) {
    state.waitingForUserCallIds.add(waitingForUserCallId);
  }
  if (responseItemType === "function_call_output" && responseItemCallId) {
    state.waitingForUserCallIds.delete(responseItemCallId);
  }
  if (eventType === "turn_aborted") {
    state.latestStatus = "done";
    state.waitingForUserCallIds.clear();
  }
}

/**
 * review モードの要素からステータスを更新する
 */
function applyReviewSessionStatus(args: { state: SessionParseState; eventType: string | null }): void {
  const { state, eventType } = args;
  if (eventType === "entered_review_mode") {
    state.isInReviewMode = true;
    applySessionKind(state, "review");
  } else if (eventType === "exited_review_mode") {
    state.isInReviewMode = false;
    applySessionKind(state, "review");
  }
  const isReviewTaskComplete =
    eventType === "task_complete" &&
    (state.isInReviewMode || state.sessionKind === "review" || state.sessionKind === "reviewSubagent");
  if (isReviewTaskComplete) {
    state.isInReviewMode = false;
    applySessionKind(state, "review");
    state.latestStatus = "done";
    return;
  }
  const reviewStatus = resolveReviewLifecycleStatus(eventType);
  if (reviewStatus != null) {
    state.latestStatus = reviewStatus;
  }
}

/**
 * ログ行の timestamp を抽出する
 */
function extractLogTimestamp(value: Record<string, unknown>): string | null {
  const timestamp = value.timestamp;
  return typeof timestamp === "string" ? timestamp : null;
}

/**
 * ログの時刻文字列をミリ秒に変換する
 */
function parseLogTimestampToMs(timestamp: string | null): number | null {
  if (!timestamp) {
    return null;
  }
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 指示文言を含むか判定する
 */
function containsInstructionMarker(text: string): boolean {
  return USER_INSTRUCTION_MARKERS.some((marker) => text.includes(marker));
}

/**
 * 環境情報メッセージを含むか判定する
 */
function containsEnvironmentContext(text: string): boolean {
  return USER_CONTEXT_MARKERS.some((marker) => text.includes(marker));
}

/**
 * ユーザー中断メッセージを含むか判定する
 */
function containsTurnAborted(text: string): boolean {
  if (!USER_TURN_ABORTED_MARKERS.every((marker) => text.includes(marker))) {
    return false;
  }
  return USER_TURN_ABORTED_BLOCK_PATTERN.test(text);
}

/**
 * 添付画像タグを含むか判定する
 */
function containsImageTag(text: string): boolean {
  return text.includes("<image name=") && text.includes("</image>");
}

/**
 * セッションメッセージのロールか判定する
 */
function isSessionMessageRole(value: string): value is SessionMessageRole {
  return value === "user" || value === "assistant";
}

/**
 * event_msg からセッションメッセージを抽出する
 */
function extractSessionMessageFromEvent(
  value: Record<string, unknown>,
): { role: SessionMessageRole; text: string } | null {
  const eventMessage = extractEventMessage(value);
  if (!eventMessage) {
    return null;
  }
  const role: SessionMessageRole = eventMessage.role === "agent" ? "assistant" : "user";
  return { role, text: eventMessage.message };
}

/**
 * セッションログ1行からassistantの全文メッセージを抽出する
 */
function extractAssistantMessageFromLogLine(line: string): string | null {
  if (!line) {
    return null;
  }
  const shouldParseJson = line.includes('"event_msg"') || line.includes('"response_item"');
  if (!shouldParseJson) {
    return null;
  }
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const responseMessage = extractResponseMessage(parsed);
    if (responseMessage?.role === "assistant") {
      return responseMessage.text;
    }
    const eventMessage = extractEventMessage(parsed);
    if (eventMessage?.role === "agent") {
      return eventMessage.message;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * メッセージ先頭からプレビュー用文字列を作る
 */
function extractPreviewFromMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  if (!normalized) {
    return null;
  }
  return normalized || null;
}

/**
 * メッセージ先頭からタイトル用文字列を作る
 */
function extractTitleFromMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }
  const newlineIndex = trimmed.search(/\r?\n/);
  const cutoff =
    newlineIndex === -1
      ? Math.min(trimmed.length, TITLE_MAX_LENGTH_CHARS)
      : Math.min(newlineIndex, TITLE_MAX_LENGTH_CHARS);
  const preview = trimmed.slice(0, cutoff).trim();
  return preview || null;
}

/**
 * セッションログの1行から解析状態を更新する
 */
function updateParseState(args: {
  line: string;
  homeDir: string | null;
  state: SessionParseState;
  skipFirstUserMessage: boolean;
}): void {
  const { line, homeDir, state, skipFirstUserMessage } = args;
  if (!line) {
    return;
  }

  const shouldParseJson =
    line.includes('"event_msg"') ||
    line.includes('"response_item"') ||
    line.includes('"turn_context"') ||
    line.includes('"session_meta"') ||
    line.includes('"response.');
  if (!shouldParseJson) {
    return;
  }

  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const logEntryType = extractLogEntryType(parsed);
    const responseLifecycleStatus = logEntryType ? resolveResponseLifecycleStatus(logEntryType) : null;
    const eventType = extractEventType(parsed);
    const sessionSource = extractSessionSource(parsed);
    const sessionThreadId = extractSessionThreadId(parsed);
    if (sessionThreadId) {
      state.sessionThreadId = sessionThreadId;
    }
    const sourceSessionKind = sessionSource !== null ? resolveSessionKindFromSource(sessionSource) : null;
    if (sourceSessionKind !== null) {
      applySessionKind(state, sourceSessionKind);
    }
    const parentThreadId = sessionSource !== null ? extractParentThreadIdFromSource(sessionSource) : null;
    if (parentThreadId) {
      state.parentThreadId = parentThreadId;
    }
    if (extractTurnContextModel(parsed) === "codex-auto-review") {
      applySessionKind(state, "autoReview");
    }
    const cwds = extractCwdsFromLog(parsed, homeDir);
    if (state.cwds.size === 0 || parsed.type === "turn_context" || parsed.type === "session_meta") {
      if (cwds.length > 0 && (parsed.type === "turn_context" || parsed.type === "session_meta")) {
        state.cwds.clear();
      }
      for (const cwd of cwds) {
        state.cwds.add(cwd);
      }
    }

    const eventMessage = extractEventMessage(parsed);
    const timestamp = extractLogTimestamp(parsed);
    const turnId = extractTurnId(parsed);
    if (turnId) {
      state.currentTurnId = turnId;
      state.reviewTurnIds.add(turnId);
    }
    if (eventMessage) {
      if (eventMessage.role === "user" && !state.firstEventUserMessage && !skipFirstUserMessage) {
        state.firstEventUserMessage = eventMessage.message;
        state.firstEventUserTurnId = state.currentTurnId;
        state.firstEventUserTimestamp = timestamp;
      }
      state.latestEventMessage = eventMessage;
    }

    const responseMessage = extractResponseMessage(parsed);
    const goalObjective = extractGoalObjectiveFromDeveloperMessage(responseMessage);
    if (goalObjective && !state.firstEventUserMessage && !state.goalObjectiveMessage) {
      state.goalObjectiveMessage = goalObjective;
      state.goalObjectiveTimestamp = timestamp;
      state.latestStatus = "working";
    }
    if (responseMessage?.role === "assistant" && responseMessage.phase === "final_answer") {
      state.latestEventMessage = { role: "agent", message: responseMessage.text };
    }
    addSkillUsage(state, extractSkillUsageFromFunctionCall(parsed, timestamp));
    if (eventMessage?.role === "agent") {
      addSkillUsage(state, extractSkillUsageFromAssistantText(eventMessage.message, timestamp));
    }
    if (responseMessage?.role === "user") {
      for (const usage of extractSkillUsagesFromUserText(responseMessage.text, timestamp)) {
        addSkillUsage(state, usage);
      }
    }
    if (responseMessage?.role === "assistant" && responseMessage.phase === "commentary") {
      addSkillUsage(state, extractSkillUsageFromAssistantText(responseMessage.text, timestamp));
    }
    const responseItemType = extractResponseItemType(parsed);
    const responseItemCallId = extractResponseItemCallId(parsed);
    const waitingForUserCallId = extractWaitingForUserCallId(parsed);
    applyNormalSessionStatus({
      state,
      responseLifecycleType: logEntryType,
      responseLifecycleStatus,
      eventMessage,
      responseMessage,
      responseItemType,
      responseItemCallId,
      waitingForUserCallId,
      eventType,
    });
    // review イベントは通常判定より優先して上書きする
    applyReviewSessionStatus({ state, eventType });
  } catch {
    // JSON 以外の行は無視する
  }
}

/**
 * セッション解析状態を完了結果へ変換する
 */
function finalizeParseState(state: SessionParseState): ParsedSessionLog {
  const titleSource = state.firstEventUserMessage ?? state.goalObjectiveMessage;
  const title = titleSource ? extractTitleFromMessage(titleSource) : null;
  const startedAtTimestamp = state.firstEventUserTimestamp ?? state.goalObjectiveTimestamp;
  let latestMessage: string | null = null;
  if (state.latestEventMessage?.message) {
    const trimmed = extractPreviewFromMessage(state.latestEventMessage.message);
    if (trimmed) {
      latestMessage = `${state.latestEventMessage.role === "agent" ? "🤖" : "🙂"} ${trimmed}`;
    }
  }
  return {
    title,
    titleTurnId: state.firstEventUserTurnId,
    cwds: Array.from(state.cwds),
    status: title ? state.latestStatus : null,
    latestMessage,
    startedAt: parseLogTimestampToMs(startedAtTimestamp),
    sessionKind: state.sessionKind,
    sessionThreadId: state.sessionThreadId,
    parentThreadId: state.parentThreadId,
    reviewTurnIds: Array.from(state.reviewTurnIds),
    isWaitingForUser: state.waitingForUserCallIds.size > 0,
    skillUsages: [...state.skillUsages],
  };
}

/**
 * パスを正規化しマッチ用エントリを作る
 */
function buildPathEntries(paths: string[]): SessionPathEntry[] {
  return paths
    .map((path) => ({
      path,
      normalized: normalizePathValue(path),
    }))
    .sort((left, right) => right.normalized.length - left.normalized.length);
}

/**
 * cwd が含まれる基準パスを前方一致で探す
 */
function matchPath(cwd: string, entries: SessionPathEntry[]): string | null {
  const normalizedCwd = normalizePathValue(cwd);
  for (const entry of entries) {
    if (normalizedCwd === entry.normalized) {
      return entry.path;
    }
    const prefix = `${entry.normalized}${sep}`;
    if (normalizedCwd.startsWith(prefix)) {
      return entry.path;
    }
  }
  return null;
}

/**
 * review 親セッション重複を除外する
 */
function dedupeReviewParentEntries<TEntry extends ReviewParentDedupeEntry>(entries: TEntry[]): TEntry[] {
  if (entries.length <= 1) {
    return entries;
  }
  const reviewSubagentEntries = entries.filter((entry) => entry.sessionKind === "reviewSubagent");
  if (reviewSubagentEntries.length === 0) {
    return entries;
  }
  const parentReviewEntries = entries
    .filter((entry) => entry.sessionKind === "review")
    .sort((left, right) => left.updatedAt - right.updatedAt);
  if (parentReviewEntries.length === 0) {
    return entries;
  }

  const consumedParentKeys = new Set<string>();
  /**
   * セッションエントリの一意キーを作る
   */
  const buildEntryKey = (entry: TEntry): string => `${entry.sessionPath ?? ""}::${entry.updatedAt}`;
  /**
   * 親レビューのタイトル起点 turn_id と review サブエージェントが一致するか判定する
   */
  const hasSharedReviewTurnId = (parentEntry: TEntry, subagentEntry: TEntry): boolean => {
    if (!parentEntry.titleTurnId || subagentEntry.reviewTurnIds.length === 0) {
      return false;
    }
    return subagentEntry.reviewTurnIds.includes(parentEntry.titleTurnId);
  };

  const sortedSubagentEntries = [...reviewSubagentEntries].sort((left, right) => left.updatedAt - right.updatedAt);
  for (const subagentEntry of sortedSubagentEntries) {
    let nearestParent: TEntry | null = null;
    let nearestDelta = Number.POSITIVE_INFINITY;
    for (const parentEntry of parentReviewEntries) {
      const parentKey = buildEntryKey(parentEntry);
      if (consumedParentKeys.has(parentKey)) {
        continue;
      }
      const delta = Math.abs(parentEntry.updatedAt - subagentEntry.updatedAt);
      if (delta > REVIEW_PARENT_DUPLICATE_WINDOW_MS || !hasSharedReviewTurnId(parentEntry, subagentEntry)) {
        continue;
      }
      if (delta < nearestDelta) {
        nearestDelta = delta;
        nearestParent = parentEntry;
      }
    }
    if (nearestParent) {
      consumedParentKeys.add(buildEntryKey(nearestParent));
    }
  }

  return entries.filter((entry) => entry.sessionKind !== "review" || !consumedParentKeys.has(buildEntryKey(entry)));
}

/**
 * タイトル一覧に表示するセッション種別か判定する
 */
function isTitleSessionKind(sessionKind: SessionKind): boolean {
  return sessionKind === "main" || sessionKind === "review" || sessionKind === "reviewSubagent";
}

/**
 * 待機中 thread id を親方向へ伝播する
 */
function expandWaitingForUserThreadIds(args: {
  waitingThreadIds: Set<string>;
  parentThreadIdByThreadId: Map<string, string>;
}): Set<string> {
  const expanded = new Set(args.waitingThreadIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const threadId of Array.from(expanded)) {
      const parentThreadId = args.parentThreadIdByThreadId.get(threadId);
      if (!parentThreadId || expanded.has(parentThreadId)) {
        continue;
      }
      expanded.add(parentThreadId);
      changed = true;
    }
  }
  return expanded;
}

/**
 * Codex App で直接開く対象のセッション種別か判定する
 */
function isMainSessionKind(sessionKind: SessionKind): boolean {
  return sessionKind === "main";
}

/**
 * セッションログ解析の純粋関数群
 */
export const sessionLogParserService = {
  buildPathEntries,
  containsEnvironmentContext,
  containsImageTag,
  containsInstructionMarker,
  containsTurnAborted,
  createParseState,
  dedupeReviewParentEntries,
  expandWaitingForUserThreadIds,
  extractAssistantMessageFromLogLine,
  extractEventMessage,
  extractLogTimestamp,
  extractResponseItemType,
  extractResponseMessage,
  extractSessionMessageFromEvent,
  extractSkillUsagesFromLogLine,
  finalizeParseState,
  isMainSessionKind,
  isSessionMessageRole,
  isSessionKind,
  isTitleSessionKind,
  isWorkingResponseItemType,
  matchPath,
  mergeSessionSkillUsages,
  updateParseState,
} as const;
