import { LocalStorage, Tool, getPreferenceValues } from "@raycast/api";
import { createHash, randomUUID } from "node:crypto";

export type JsonObject = Record<string, unknown>;
export type Input = {
  prompt: string;
  delegationReason?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  fallbackModelsCsv?: string;
  originatingIntentId?: string;
  rootExecutionId?: string;
  parentExecutionId?: string;
  delegatedObjective?: string;
  relationshipMetadataJson?: string;
  capabilityDescriptorJson?: string;
  lifecycleMetadataJson?: string;
  governanceContextJson?: string;
  preDispatchHookUrl?: string;
  postResultHookUrl?: string;
  hookHeadersJson?: string;
  requireAcknowledgement?: boolean;
  acknowledgementLine?: string;
};
type Preferences = {
  ollama_endpoint: string;
  default_model: string;
  request_timeout_seconds?: string;
  log_delegations?: boolean;
};
export type Envelope = {
  envelopeId: string;
  originatingIntentId?: string;
  rootExecutionId: string;
  parentExecutionId: string;
  childExecutionId: string;
  delegatedObjective: string;
  delegationReason?: string;
  relationshipMetadata?: JsonObject;
  capabilityDescriptor?: JsonObject;
  lifecycleMetadata?: JsonObject;
  governanceContext?: JsonObject;
  createdAtIso: string;
  integrityHash: string;
};
export type Receipt = {
  stage: "pre-dispatch" | "post-result";
  hookUrl: string;
  decision: string;
  receipt?: JsonObject;
};
export type ForkResult = {
  executionStatus: "completed" | "error" | "timeout" | "blocked";
  executionPhase: "blocked" | "attempted" | "executed" | "observed";
  childOutput: string;
  model: string;
  executionTimeMs: number;
  envelope: Envelope;
  acknowledgementRequired: boolean;
  acknowledgementVerified?: boolean;
  doneVerified: false;
  attempts: number;
  attemptedModels: string[];
  evidence: { outputSha256: string; outputObserved: boolean; governanceReceipts: Receipt[] };
  tokensUsed?: number;
  tokenBreakdown?: { prompt?: number; completion?: number; total?: number };
  error?: string;
  blockedReason?: string;
};
type Contracts = {
  relationshipMetadata?: JsonObject;
  capabilityDescriptor?: JsonObject;
  lifecycleMetadata?: JsonObject;
  governanceContext?: JsonObject;
  hookHeaders: Record<string, string>;
};
type Hook = {
  decision: "allow" | "deny" | "accept" | "reject";
  reason?: string;
  receipt?: JsonObject;
};
const AUDIT_KEY = "agent-fork-audit-v2",
  DEFAULT_ACK = "DELEGATION_ACK: accepted";

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Agent Fork — delegate sub-agent execution",
  info: [
    {
      name: "Objective",
      value: input.delegatedObjective || truncate(input.prompt.replace(/\s+/g, " "), 180),
    },
    { name: "Parent execution", value: input.parentExecutionId || "(generated root execution)" },
    { name: "Model", value: input.model || "(extension default)" },
    { name: "Pre-dispatch hook", value: input.preDispatchHookUrl || "(none)" },
    { name: "Post-result hook", value: input.postResultHookUrl || "(none)" },
  ],
});

export default async function spawnSubAgent(input: Input): Promise<ForkResult> {
  const started = Date.now(),
    prefs = getPreferenceValues<Preferences>();
  const parsed = parseInputContracts(input);
  if (!parsed.ok) return blocked(started, input, parsed.error);
  const model = (input.model || prefs.default_model || "").trim();
  if (!model) return blocked(started, input, "No model provided and no default model configured.");
  const envelope = buildEnvelope(input, parsed.contracts),
    receipts: Receipt[] = [];

  if (input.preDispatchHookUrl) {
    const admission = await invokeGovernanceHook(
      input.preDispatchHookUrl,
      parsed.contracts.hookHeaders,
      { stage: "pre-dispatch", envelope }
    );
    if (!admission.ok) return blocked(started, input, admission.error, envelope, receipts);
    receipts.push({ stage: "pre-dispatch", hookUrl: input.preDispatchHookUrl, ...admission.value });
    if (admission.value.decision !== "allow")
      return blocked(
        started,
        input,
        admission.value.reason || "Pre-dispatch hook denied execution.",
        envelope,
        receipts
      );
  }

  const ackRequired = input.requireAcknowledgement ?? false;
  const ackLine = (input.acknowledgementLine || DEFAULT_ACK).trim();
  const prompt = buildPrompt(input.prompt, envelope, ackRequired, ackLine);
  const models = unique([model, ...csv(input.fallbackModelsCsv)]);
  let attempts = 0,
    phase: ForkResult["executionPhase"] = "attempted",
    lastError = "No model attempt completed.";

  for (const candidate of models) {
    attempts++;
    try {
      phase = "attempted";
      const response = await callOllama(
        normalizeEndpoint(prefs.ollama_endpoint),
        candidate,
        prompt,
        clamp(input.temperature),
        input.maxTokens,
        timeoutMs(prefs.request_timeout_seconds)
      );
      phase = "executed";
      const ack = parseAcknowledgement(response.output, ackRequired ? ackLine : undefined);
      phase = "observed";
      if (ackRequired && !ack.verified) {
        const failed = failure(
          started,
          input,
          envelope,
          receipts,
          models,
          attempts,
          candidate,
          "observed",
          "error",
          "Child output did not begin with the required acknowledgement line.",
          ack.output
        );
        await audit(prefs, input.prompt, failed);
        return failed;
      }
      if (input.postResultHookUrl) {
        const validation = await invokeGovernanceHook(
          input.postResultHookUrl,
          parsed.contracts.hookHeaders,
          {
            stage: "post-result",
            envelope,
            result: {
              executionStatus: "completed",
              executionPhase: "observed",
              model: candidate,
              childOutput: ack.output,
              outputSha256: sha256(ack.output),
            },
          }
        );
        if (!validation.ok) {
          const failed = failure(
            started,
            input,
            envelope,
            receipts,
            models,
            attempts,
            candidate,
            "observed",
            "error",
            validation.error,
            ack.output
          );
          await audit(prefs, input.prompt, failed);
          return failed;
        }
        receipts.push({
          stage: "post-result",
          hookUrl: input.postResultHookUrl,
          ...validation.value,
        });
        if (validation.value.decision !== "accept") {
          const failed = failure(
            started,
            input,
            envelope,
            receipts,
            models,
            attempts,
            candidate,
            "observed",
            "blocked",
            validation.value.reason || "Post-result hook rejected the result.",
            ack.output
          );
          await audit(prefs, input.prompt, failed);
          return failed;
        }
      }
      const result: ForkResult = {
        executionStatus: "completed",
        executionPhase: "observed",
        childOutput: ack.output,
        model: candidate,
        executionTimeMs: Date.now() - started,
        envelope,
        acknowledgementRequired: ackRequired,
        acknowledgementVerified: ack.verified,
        doneVerified: false,
        attempts,
        attemptedModels: models,
        evidence: {
          outputSha256: sha256(ack.output),
          outputObserved: true,
          governanceReceipts: receipts,
        },
        tokensUsed: response.total,
        tokenBreakdown: {
          prompt: response.prompt,
          completion: response.completion,
          total: response.total,
        },
      };
      await audit(prefs, input.prompt, result);
      return result;
    } catch (error) {
      lastError = message(error);
      if (attempts === models.length) {
        const status = /timeout/i.test(lastError) ? "timeout" : "error";
        const failed = failure(
          started,
          input,
          envelope,
          receipts,
          models,
          attempts,
          candidate,
          phase,
          status,
          lastError
        );
        await audit(prefs, input.prompt, failed);
        return failed;
      }
    }
  }
  return blocked(started, input, lastError, envelope, receipts);
}

export function parseInputContracts(
  input: Input
): { ok: true; contracts: Contracts } | { ok: false; error: string } {
  const contracts: Partial<Contracts> = {};
  const fields: Array<[string, string | undefined]> = [
    ["relationshipMetadata", input.relationshipMetadataJson],
    ["capabilityDescriptor", input.capabilityDescriptorJson],
    ["lifecycleMetadata", input.lifecycleMetadataJson],
    ["governanceContext", input.governanceContextJson],
  ];
  for (const [name, raw] of fields) {
    if (!raw) continue;
    try {
      const value = JSON.parse(raw);
      if (!object(value)) return { ok: false, error: `${name}Json must contain a JSON object.` };
      (contracts as JsonObject)[name] = value;
    } catch {
      return { ok: false, error: `${name}Json is not valid JSON.` };
    }
  }
  let hookHeaders: Record<string, string> = {};
  if (input.hookHeadersJson) {
    try {
      const value = JSON.parse(input.hookHeadersJson);
      if (!object(value) || Object.values(value).some((v) => typeof v !== "string"))
        return {
          ok: false,
          error: "hookHeadersJson must contain a JSON object with string values.",
        };
      hookHeaders = value as Record<string, string>;
    } catch {
      return { ok: false, error: "hookHeadersJson is not valid JSON." };
    }
  }
  for (const [name, url] of [
    ["preDispatchHookUrl", input.preDispatchHookUrl],
    ["postResultHookUrl", input.postResultHookUrl],
  ]) {
    if (!url) continue;
    try {
      if (!["http:", "https:"].includes(new URL(url).protocol))
        return { ok: false, error: `${name} must use http or https.` };
    } catch {
      return { ok: false, error: `${name} must be a valid absolute URL.` };
    }
  }
  return { ok: true, contracts: { ...contracts, hookHeaders } as Contracts };
}

export function buildEnvelope(input: Input, contracts: Contracts): Envelope {
  const rootExecutionId = (input.rootExecutionId || randomUUID()).trim(),
    parentExecutionId = (input.parentExecutionId || rootExecutionId).trim();
  const base = {
    envelopeId: randomUUID(),
    originatingIntentId: input.originatingIntentId?.trim() || undefined,
    rootExecutionId,
    parentExecutionId,
    childExecutionId: randomUUID(),
    delegatedObjective: (input.delegatedObjective || truncate(input.prompt, 240)).trim(),
    delegationReason: input.delegationReason?.trim() || undefined,
    relationshipMetadata: contracts.relationshipMetadata,
    capabilityDescriptor: contracts.capabilityDescriptor,
    lifecycleMetadata: contracts.lifecycleMetadata,
    governanceContext: contracts.governanceContext,
    createdAtIso: new Date().toISOString(),
  };
  return { ...base, integrityHash: sha256(canonical(base)) };
}

export async function invokeGovernanceHook(
  url: string,
  headers: Record<string, string>,
  payload: JsonObject
): Promise<{ ok: true; value: Hook } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
    if (!response.ok)
      return {
        ok: false,
        error: `Governance hook returned HTTP ${response.status}: ${await safeText(response)}`,
      };
    const value: unknown = await response.json();
    if (!object(value) || !["allow", "deny", "accept", "reject"].includes(String(value.decision)))
      return {
        ok: false,
        error:
          "Governance hook returned a malformed response; expected decision allow|deny|accept|reject.",
      };
    if (value.receipt !== undefined && !object(value.receipt))
      return { ok: false, error: "Governance hook receipt must be a JSON object when present." };
    return { ok: true, value: value as Hook };
  } catch (error) {
    return { ok: false, error: `Governance hook failed: ${message(error)}` };
  }
}

export function buildPrompt(
  task: string,
  envelope: Envelope,
  requireAck: boolean,
  ackLine: string
): string {
  return [
    "[DELEGATION ENVELOPE]",
    canonical(envelope),
    ...(requireAck ? ["", "[ACKNOWLEDGEMENT]", `First line MUST be exactly: ${ackLine}`] : []),
    "",
    "[TASK]",
    task.trim(),
  ].join("\n");
}
export function parseAcknowledgement(
  output: string,
  expected?: string
): { verified?: boolean; output: string } {
  const normalized = output.trimStart();
  if (!expected) return { verified: undefined, output: normalized };
  const first = normalized.split(/\r?\n/, 1)[0].trim(),
    verified = first === expected.trim();
  const newline = normalized.indexOf("\n");
  return {
    verified,
    output: verified ? (newline < 0 ? "" : normalized.slice(newline + 1).trimStart()) : normalized,
  };
}

async function callOllama(
  endpoint: string,
  model: string,
  prompt: string,
  temperature: number,
  maxTokens: number | undefined,
  timeout: number
) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), timeout);
  try {
    try {
      const r = await fetch(`${endpoint}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      });
      if (!r.ok) throw new Error(`Ollama API error (${r.status}): ${await safeText(r)}`);
      const j = (await r.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const output = j.choices?.[0]?.message?.content;
      if (!output) throw new Error("Ollama response did not include choices[0].message.content");
      return {
        output,
        prompt: j.usage?.prompt_tokens,
        completion: j.usage?.completion_tokens,
        total: j.usage?.total_tokens,
      };
    } catch (primary) {
      if (aborted(primary)) throw new Error(`Request timeout: ${timeout} ms`);
      const r = await fetch(`${endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature, num_predict: maxTokens },
        }),
      });
      if (!r.ok) throw new Error(`Ollama fallback API error (${r.status}): ${await safeText(r)}`);
      const j = (await r.json()) as {
        response?: string;
        prompt_eval_count?: number;
        eval_count?: number;
      };
      if (!j.response) throw new Error("Ollama fallback response did not include response text");
      const total =
        typeof j.prompt_eval_count === "number" && typeof j.eval_count === "number"
          ? j.prompt_eval_count + j.eval_count
          : undefined;
      return { output: j.response, prompt: j.prompt_eval_count, completion: j.eval_count, total };
    }
  } catch (error) {
    if (aborted(error)) throw new Error(`Request timeout: ${timeout} ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function failure(
  started: number,
  input: Input,
  envelope: Envelope,
  receipts: Receipt[],
  models: string[],
  attempts: number,
  model: string,
  phase: ForkResult["executionPhase"],
  status: "error" | "timeout" | "blocked",
  error: string,
  childOutput = ""
): ForkResult {
  return {
    executionStatus: status,
    executionPhase: status === "blocked" ? "blocked" : phase,
    childOutput,
    model,
    executionTimeMs: Date.now() - started,
    envelope,
    acknowledgementRequired: input.requireAcknowledgement ?? false,
    acknowledgementVerified: false,
    doneVerified: false,
    attempts,
    attemptedModels: models,
    evidence: {
      outputSha256: sha256(childOutput),
      outputObserved: Boolean(childOutput),
      governanceReceipts: receipts,
    },
    error,
    blockedReason: status === "blocked" ? error : undefined,
  };
}
function blocked(
  started: number,
  input: Input,
  reason: string,
  envelope?: Envelope,
  receipts: Receipt[] = []
): ForkResult {
  return failure(
    started,
    input,
    envelope || buildEnvelope(input, { hookHeaders: {} }),
    receipts,
    [],
    0,
    input.model || "(none)",
    "blocked",
    "blocked",
    reason
  );
}
async function audit(prefs: Preferences, prompt: string, result: ForkResult): Promise<void> {
  if (!(prefs.log_delegations ?? true)) return;
  let previous: unknown[] = [];
  const raw = await LocalStorage.getItem<string>(AUDIT_KEY);
  if (raw)
    try {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) previous = value;
    } catch {
      previous = [];
    }
  const record = {
    timestampIso: new Date().toISOString(),
    envelopeId: result.envelope.envelopeId,
    rootExecutionId: result.envelope.rootExecutionId,
    parentExecutionId: result.envelope.parentExecutionId,
    childExecutionId: result.envelope.childExecutionId,
    executionStatus: result.executionStatus,
    executionPhase: result.executionPhase,
    model: result.model,
    attempts: result.attempts,
    promptSha256: sha256(prompt),
    outputSha256: result.evidence.outputSha256,
    envelopeIntegrityHash: result.envelope.integrityHash,
  };
  await LocalStorage.setItem(AUDIT_KEY, JSON.stringify([record, ...previous].slice(0, 1000)));
}
function timeoutMs(v?: string) {
  const n = Number.parseInt(v || "120", 10);
  return Math.min(600000, Math.max(10000, (Number.isNaN(n) ? 120 : n) * 1000));
}
function csv(v?: string) {
  return v
    ? v
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
}
function unique(v: string[]) {
  return [...new Set(v)];
}
function normalizeEndpoint(v: string) {
  return v.trim().replace(/\/+$/, "");
}
function clamp(v?: number) {
  return typeof v === "number" && !Number.isNaN(v) ? Math.min(2, Math.max(0, v)) : 0;
}
function aborted(e: unknown) {
  return e instanceof Error && (e.name === "AbortError" || /aborted|timeout/i.test(e.message));
}
function message(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}
function object(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function canonical(v: unknown): string {
  return JSON.stringify(sort(v));
}
function sort(v: unknown): unknown {
  return Array.isArray(v)
    ? v.map(sort)
    : object(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sort(v[k])])
        )
      : v;
}
function sha256(v: string) {
  return createHash("sha256").update(v, "utf8").digest("hex");
}
function truncate(v: string, n: number) {
  return v.length <= n ? v : `${v.slice(0, n - 1)}…`;
}
async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "<unreadable response>";
  }
}
