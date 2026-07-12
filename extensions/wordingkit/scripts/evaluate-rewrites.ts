import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateManualEvalModes } from "./generate-manual-eval-modes.ts";
import { rewriteText } from "../src/providers.ts";
import type { EditingMode, Provider } from "../src/modes.ts";

type ManualMode = Omit<EditingMode, "lastUsedAt">;

export type QualityWarningCategory =
  | "language-mismatch"
  | "placeholder"
  | "assistant-response"
  | "english-sentence"
  | "added-code-block"
  | "added-ticket-id"
  | "too-long";

export type QualityWarning = {
  categories: QualityWarningCategory[];
  details: string[];
};

export type ResultScore = "ok" | "warning" | "bad";

export type EvaluationResult = {
  messageIndex: number;
  modeId: string;
  modeTitle: string;
  provider: Provider;
  model: string;
  status: "ok" | "error";
  score?: ResultScore;
  durationMs: number;
  output?: string;
  error?: string;
  qualityWarning?: QualityWarning;
};

export type ModelSummary = {
  provider: Provider;
  model: string;
  ok: number;
  error: number;
  averageDurationMs: number;
  medianDurationMs: number;
  languageWarnings: number;
  tooLongWarnings: number;
  assistantResponseWarnings: number;
  englishSentenceWarnings: number;
  addedCodeBlockWarnings: number;
  addedTicketIdWarnings: number;
  qualityWarnings: number;
  scoreOk: number;
  scoreWarning: number;
  scoreBad: number;
};

export type ModeSummary = {
  modeTitle: string;
  ok: number;
  error: number;
  averageDurationMs: number;
  medianDurationMs: number;
  languageWarnings: number;
  tooLongWarnings: number;
  assistantResponseWarnings: number;
  englishSentenceWarnings: number;
  addedCodeBlockWarnings: number;
  addedTicketIdWarnings: number;
  qualityWarnings: number;
  scoreOk: number;
  scoreWarning: number;
  scoreBad: number;
};

export type EvaluationReport = {
  generatedAt: string;
  messages: string[];
  modes: ManualMode[];
  results: EvaluationResult[];
  modelSummaries?: ModelSummary[];
  modeSummaries?: ModeSummary[];
};

const PROVIDERS: ReadonlySet<string> = new Set([
  "openai",
  "anthropic",
  "groq",
  "ollama",
]);

const API_KEY_ENV: Record<Exclude<Provider, "ollama">, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  groq: "GROQ_API_KEY",
};

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireText(
  record: Record<string, unknown>,
  key: string,
  label: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}.${key} must be a non-empty string.`);
  }
  return value.trim();
}

function requireNumber(
  record: Record<string, unknown>,
  key: string,
  label: string,
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}.${key} must be a finite number.`);
  }
  return value;
}

export function validateManualMessages(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("messages.json must be an array of strings.");
  }

  return value.map((message, index) => {
    if (typeof message !== "string" || !message.trim()) {
      throw new Error(`messages.json[${index}] must be a non-empty string.`);
    }
    return message.trim();
  });
}

export function validateManualModes(value: unknown): ManualMode[] {
  if (!Array.isArray(value)) {
    throw new Error("modes.json must be an array of mode objects.");
  }

  return value.map((rawMode, index) => {
    const label = `modes.json[${index}]`;
    const record = assertRecord(rawMode, label);
    const provider = requireText(record, "provider", label);
    if (!PROVIDERS.has(provider)) {
      throw new Error(
        `${label}.provider must be one of openai, anthropic, groq, ollama.`,
      );
    }

    const maxTokens = requireNumber(record, "maxTokens", label);
    if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
      throw new Error(`${label}.maxTokens must be a positive integer.`);
    }

    const temperature = requireNumber(record, "temperature", label);
    if (temperature < 0 || temperature > 2) {
      throw new Error(`${label}.temperature must be between 0 and 2.`);
    }

    return {
      id:
        typeof record.id === "string" && record.id.trim()
          ? record.id.trim()
          : `mode-${index + 1}`,
      title: requireText(record, "title", label),
      provider: provider as Provider,
      model: requireText(record, "model", label),
      systemPrompt: requireText(record, "systemPrompt", label),
      temperature,
      maxTokens,
    };
  });
}

function sanitizeText(value: string, secrets: string[]): string {
  return secrets
    .filter((secret) => secret.trim().length > 0)
    .reduce(
      (current, secret) => current.replaceAll(secret, "[REDACTED]"),
      value,
    );
}

function formatBlock(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => (line.length > 0 ? `> ${line}` : ">"))
    .join("\n");
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function hasAssistantResponsePhrase(value: string): boolean {
  return /предоставьте текст|пожалуйста, предоставьте|я могу помочь|следующие шаги|нужен текст|пришлите текст|уточните/i.test(
    value,
  );
}

function hasFullEnglishSentence(value: string): boolean {
  return /\b(?:I|You|We|They|He|She|It|The|A|An|Please|This|That|There|Here|If|When|While|Because|Can|Could|Would|Should|Need|Let|Provide|Check|Fix|Review|Explain|Find|Make|Next|Steps)\b(?:[\s,;:'"()/-]+[A-Za-z][A-Za-z0-9'’/-]*){3,}[.!?]/i.test(
    value,
  );
}

function hasJsonOrCodeBlock(value: string): boolean {
  return (
    /(^|\n)\s*(```|~~~)/.test(value) ||
    /(^|\n)\s*[\[{]\s*\n[\s\S]*"[^"]+"\s*:/.test(value)
  );
}

function extractTicketIds(value: string): string[] {
  const matches = value.match(/\b(?:[A-Z][A-Z0-9]+-\d+|MR\s*!?\s*\d+|!\d+)\b/g);
  return uniqueValues(
    (matches ?? []).map((match) => match.toUpperCase().replace(/\s+/g, " ")),
  );
}

function hasAddedTicketIds(output: string, original: string): boolean {
  const originalIds = new Set(extractTicketIds(original));
  return extractTicketIds(output).some((id) => !originalIds.has(id));
}

function hasCategory(
  result: EvaluationResult,
  category: QualityWarningCategory,
): boolean {
  return Boolean(result.qualityWarning?.categories.includes(category));
}

export function classifyResultScore(
  qualityWarning?: QualityWarning,
): ResultScore {
  if (!qualityWarning) return "ok";
  const badCategories: QualityWarningCategory[] = [
    "language-mismatch",
    "assistant-response",
    "english-sentence",
    "added-code-block",
    "added-ticket-id",
    "too-long",
  ];
  if (
    qualityWarning.categories.some((category) =>
      badCategories.includes(category),
    )
  ) {
    return "bad";
  }
  return "warning";
}

function resultScore(result: EvaluationResult): ResultScore {
  if (result.score) return result.score;
  if (result.status === "error") return "bad";
  return classifyResultScore(result.qualityWarning);
}

function warningCounts(results: EvaluationResult[]) {
  return {
    languageWarnings: results.filter((result) =>
      hasCategory(result, "language-mismatch"),
    ).length,
    tooLongWarnings: results.filter((result) => hasCategory(result, "too-long"))
      .length,
    assistantResponseWarnings: results.filter((result) =>
      hasCategory(result, "assistant-response"),
    ).length,
    englishSentenceWarnings: results.filter((result) =>
      hasCategory(result, "english-sentence"),
    ).length,
    addedCodeBlockWarnings: results.filter((result) =>
      hasCategory(result, "added-code-block"),
    ).length,
    addedTicketIdWarnings: results.filter((result) =>
      hasCategory(result, "added-ticket-id"),
    ).length,
    qualityWarnings: results.filter((result) => result.qualityWarning).length,
    scoreOk: results.filter((result) => resultScore(result) === "ok").length,
    scoreWarning: results.filter((result) => resultScore(result) === "warning")
      .length,
    scoreBad: results.filter((result) => resultScore(result) === "bad").length,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function baseModeTitle(result: EvaluationResult): string {
  return result.modeTitle
    .replace(new RegExp(`\\s/\\s${escapeRegExp(result.model)}$`), "")
    .trim();
}

export function detectQualityWarnings(
  output: string,
  original: string,
): QualityWarning | undefined {
  const categories: QualityWarningCategory[] = [];
  const details: string[] = [];

  if (/[\u4e00-\u9fff]/.test(output)) {
    categories.push("language-mismatch");
    details.push("Output contains Chinese characters.");
  }

  if (/\[[^\]]+\]|\{[^}]+\}|Ваше имя|Имя Фамилия|С уважением/i.test(output)) {
    categories.push("placeholder");
    details.push(
      "Output contains placeholders or signature-like template text.",
    );
  }

  if (
    hasAssistantResponsePhrase(output) &&
    !hasAssistantResponsePhrase(original)
  ) {
    categories.push("assistant-response");
    details.push(
      "Output looks like an assistant response instead of a rewrite.",
    );
  }

  if (/[А-Яа-яЁё]/.test(original) && hasFullEnglishSentence(output)) {
    categories.push("english-sentence");
    details.push(
      "Output contains full English sentences while the original is Russian.",
    );
  }

  if (hasJsonOrCodeBlock(output) && !hasJsonOrCodeBlock(original)) {
    categories.push("added-code-block");
    details.push(
      "Output added a JSON or code block that was not present in the original.",
    );
  }

  if (hasAddedTicketIds(output, original)) {
    categories.push("added-ticket-id");
    details.push(
      "Output added ticket-like IDs that were not present in the original.",
    );
  }

  if (original.trim().length > 0 && output.length > original.length * 2.5) {
    categories.push("too-long");
    details.push("Output is more than 2.5x longer than the original message.");
  }

  if (categories.length === 0) return undefined;

  return {
    categories: uniqueValues(categories),
    details: uniqueValues(details),
  };
}

export function buildModelSummaries(report: EvaluationReport): ModelSummary[] {
  const summaries: ModelSummary[] = [];

  for (const model of uniqueValues(
    report.results.map((result) => result.model),
  )) {
    const results = report.results.filter((result) => result.model === model);
    const firstResult = results[0];
    const durations = results.map((result) => result.durationMs);

    summaries.push({
      provider: firstResult.provider,
      model,
      ok: results.filter((result) => result.status === "ok").length,
      error: results.filter((result) => result.status === "error").length,
      averageDurationMs: average(durations),
      medianDurationMs: median(durations),
      ...warningCounts(results),
    });
  }

  return summaries;
}

export function buildModeSummaries(report: EvaluationReport): ModeSummary[] {
  const summaries: ModeSummary[] = [];

  for (const modeTitle of uniqueValues(report.results.map(baseModeTitle))) {
    const results = report.results.filter(
      (result) => baseModeTitle(result) === modeTitle,
    );
    const durations = results.map((result) => result.durationMs);

    summaries.push({
      modeTitle,
      ok: results.filter((result) => result.status === "ok").length,
      error: results.filter((result) => result.status === "error").length,
      averageDurationMs: average(durations),
      medianDurationMs: median(durations),
      ...warningCounts(results),
    });
  }

  return summaries;
}

export function renderMarkdownReport(
  report: EvaluationReport,
  secrets: string[] = [],
): string {
  const lines: string[] = [
    "# WordingKit Rewrite Evaluation",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
  ];

  const summaries = report.modelSummaries ?? buildModelSummaries(report);
  if (summaries.length > 0) {
    lines.push("## Model Summary", "");
    lines.push(
      "| Model | Provider | OK | Error | Score OK | Score Warning | Score Bad | Avg Duration | Median Duration | Language Warnings | Assistant Response | English Sentence | Added Code/JSON | Added Ticket IDs | Too Long | Quality Warnings |",
    );
    lines.push(
      "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    );
    for (const summary of summaries) {
      lines.push(
        `| ${summary.model} | ${summary.provider} | ${summary.ok} | ${summary.error} | ${summary.scoreOk} | ${summary.scoreWarning} | ${summary.scoreBad} | ${summary.averageDurationMs} ms | ${summary.medianDurationMs} ms | ${summary.languageWarnings} | ${summary.assistantResponseWarnings} | ${summary.englishSentenceWarnings} | ${summary.addedCodeBlockWarnings} | ${summary.addedTicketIdWarnings} | ${summary.tooLongWarnings} | ${summary.qualityWarnings} |`,
      );
    }
    lines.push("");
  }

  const modeSummaries = report.modeSummaries ?? buildModeSummaries(report);
  if (modeSummaries.length > 0) {
    lines.push("## Mode Summary", "");
    lines.push(
      "| Mode | OK | Error | Score OK | Score Warning | Score Bad | Avg Duration | Median Duration | Language Warnings | Assistant Response | English Sentence | Added Code/JSON | Added Ticket IDs | Too Long | Quality Warnings |",
    );
    lines.push(
      "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    );
    for (const summary of modeSummaries) {
      lines.push(
        `| ${summary.modeTitle} | ${summary.ok} | ${summary.error} | ${summary.scoreOk} | ${summary.scoreWarning} | ${summary.scoreBad} | ${summary.averageDurationMs} ms | ${summary.medianDurationMs} ms | ${summary.languageWarnings} | ${summary.assistantResponseWarnings} | ${summary.englishSentenceWarnings} | ${summary.addedCodeBlockWarnings} | ${summary.addedTicketIdWarnings} | ${summary.tooLongWarnings} | ${summary.qualityWarnings} |`,
      );
    }
    lines.push("");
  }

  for (const [messageIndex, message] of report.messages.entries()) {
    lines.push(`## Message ${messageIndex + 1}`, "");
    lines.push("### Original", "");
    lines.push(formatBlock(sanitizeText(message, secrets)), "");

    for (const mode of report.modes) {
      const result = report.results.find(
        (item) => item.messageIndex === messageIndex && item.modeId === mode.id,
      );
      lines.push(`### ${mode.title}`, "");
      lines.push(`Provider: \`${mode.provider}\``);
      lines.push(`Model: \`${mode.model}\``);

      if (!result) {
        lines.push("Duration: `n/a`", "");
        lines.push("Score: `bad`", "");
        lines.push("Status: `error`", "");
        lines.push(formatBlock("Missing evaluation result."), "");
      } else if (result.status === "ok") {
        lines.push(`Duration: \`${result.durationMs} ms\``, "");
        lines.push(`Score: \`${resultScore(result)}\``, "");
        lines.push("Status: `ok`", "");
        if (result.qualityWarning) {
          lines.push(
            `Quality warning: \`${result.qualityWarning.categories.join(", ")}\``,
            "",
          );
        }
        lines.push(formatBlock(sanitizeText(result.output ?? "", secrets)), "");
      } else {
        lines.push(`Duration: \`${result.durationMs} ms\``, "");
        lines.push(`Score: \`${resultScore(result)}\``, "");
        lines.push("Status: `error`", "");
        lines.push(formatBlock(sanitizeText(result.error ?? "", secrets)), "");
      }
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function getApiKey(provider: Provider): string | undefined {
  if (provider === "ollama") return undefined;
  return process.env[API_KEY_ENV[provider]];
}

function missingApiKeyError(provider: Exclude<Provider, "ollama">): Error {
  return new Error(`Missing ${API_KEY_ENV[provider]} environment variable.`);
}

async function runEvaluation(projectRoot: string): Promise<void> {
  const inputDir = path.join(projectRoot, "manual-eval");
  console.log(await generateManualEvalModes(projectRoot));
  const messages = validateManualMessages(
    await readJsonFile(path.join(inputDir, "messages.json")),
  );
  const modes = validateManualModes(
    await readJsonFile(path.join(inputDir, "modes.json")),
  );
  const secrets = [
    process.env.OPENAI_API_KEY,
    process.env.ANTHROPIC_API_KEY,
    process.env.GROQ_API_KEY,
  ].filter((value): value is string => Boolean(value));
  const results: EvaluationResult[] = [];
  const total = messages.length * modes.length;
  let completed = 0;

  for (const [messageIndex, message] of messages.entries()) {
    for (const mode of modes) {
      completed += 1;
      let durationMs = 0;
      try {
        const apiKey = getApiKey(mode.provider);
        if (mode.provider !== "ollama" && !apiKey) {
          throw missingApiKeyError(mode.provider);
        }

        const startedAt = Date.now();
        let output: string;
        try {
          output = await rewriteText({
            text: message,
            mode,
            apiKey,
            ollamaUrl: process.env.OLLAMA_URL,
          });
        } finally {
          durationMs = Date.now() - startedAt;
        }
        const qualityWarning = detectQualityWarnings(
          sanitizeText(output, secrets),
          message,
        );
        const score = classifyResultScore(qualityWarning);
        results.push({
          messageIndex,
          modeId: mode.id,
          modeTitle: mode.title,
          provider: mode.provider,
          model: mode.model,
          status: "ok",
          score,
          durationMs,
          qualityWarning,
          output: sanitizeText(output, secrets),
        });
        const warning = results.at(-1)?.qualityWarning;
        console.log(
          `${completed}/${total} ${mode.title} -> ok score=${score} (${durationMs} ms)${
            warning ? ` warning=${warning.categories.join(",")}` : ""
          }`,
        );
      } catch (reason) {
        results.push({
          messageIndex,
          modeId: mode.id,
          modeTitle: mode.title,
          provider: mode.provider,
          model: mode.model,
          status: "error",
          score: "bad",
          durationMs,
          error: sanitizeText(
            reason instanceof Error ? reason.message : String(reason),
            secrets,
          ),
        });
        console.log(
          `${completed}/${total} ${mode.title} -> error score=bad (${durationMs} ms)`,
        );
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const report: EvaluationReport = {
    generatedAt,
    messages,
    modes,
    results,
  };
  report.modelSummaries = buildModelSummaries(report);
  report.modeSummaries = buildModeSummaries(report);
  const reportsDir = path.join(inputDir, "reports");
  await mkdir(reportsDir, { recursive: true });

  const timestamp = generatedAt.replaceAll(":", "-");
  const markdownPath = path.join(reportsDir, `${timestamp}.md`);
  const jsonPath = path.join(reportsDir, `${timestamp}.json`);

  await writeFile(markdownPath, renderMarkdownReport(report, secrets), "utf8");
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Markdown report: ${markdownPath}`);
  console.log(`JSON report: ${jsonPath}`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (currentFile === invokedFile) {
  runEvaluation(path.resolve(path.dirname(currentFile), "..")).catch(
    (reason) => {
      console.error(reason instanceof Error ? reason.message : String(reason));
      process.exitCode = 1;
    },
  );
}
