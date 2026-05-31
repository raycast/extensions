#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { generateWithProvider } = await jiti.import("../src/providers.ts");
const { parseRewriteResult } = await jiti.import("../src/rewrite.ts");

const samples = [
  {
    id: "deadline-reminder",
    label: "委婉催文件",
    text: "我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。",
  },
  {
    id: "non-blaming-explanation",
    label: "不归责地解释",
    text: "我想跟外国同事说，这事不是你做得不好，是我们之前没有把要求讲清楚。",
  },
  {
    id: "hotel-request",
    label: "服务场景请求",
    text: "我想跟酒店前台说，房间里的空调声音太大了，能不能换一个安静一点的房间。",
  },
  {
    id: "advisor-update",
    label: "学术/导师沟通",
    text: "我想跟导师说，材料我已经基本写完了，但还想再核对一下数据，能不能明天上午发给他。",
  },
  {
    id: "reschedule-meeting",
    label: "拒绝或改期",
    text: "我想礼貌地说今天不太方便开会，能不能改到明天下午。",
  },
  {
    id: "mild-disagreement",
    label: "轻微异议",
    text: "我想说我理解他的观点，但这个方案可能会让后续维护变复杂。",
  },
];

const rewriteResponseSchema = {
  type: "object",
  properties: {
    rewritten: {
      type: "string",
      description: "Only the rewritten English text, with no labels, quotes, or Markdown.",
    },
    why: {
      type: "string",
      description: 'A concise Simplified Chinese Markdown bullet list. Each point starts with "- ".',
    },
  },
  required: ["rewritten", "why"],
  additionalProperties: false,
  propertyOrdering: ["rewritten", "why"],
};

const rewriteToneInstructions = {
  natural: "Aim for the default everyday register a native speaker would naturally use in this situation.",
};

const variants = [
  {
    id: "baseline",
    title: "Baseline",
    buildPrompt: buildBaselinePrompt,
  },
  {
    id: "candidate-a",
    title: "Candidate A",
    buildPrompt: buildCandidateAPrompt,
  },
  {
    id: "candidate-b",
    title: "Candidate B",
    buildPrompt: buildCandidateBPrompt,
  },
];

const providerDefaults = {
  mimo: {
    id: "mimo",
    title: "Xiaomi MiMo",
    apiKeyEnv: "MIMO_API_KEY",
    baseURLEnv: "MIMO_BASE_URL",
    modelEnv: "MIMO_MODEL",
    baseURL: "https://token-plan-cn.xiaomimimo.com/anthropic",
    model: "mimo-v2.5",
    apiProtocol: "anthropic",
  },
  openai: {
    id: "openai",
    title: "OpenAI / ChatGPT",
    apiKeyEnv: "OPENAI_API_KEY",
    baseURLEnv: "OPENAI_BASE_URL",
    modelEnv: "OPENAI_MODEL",
    baseURL: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    apiProtocol: "openai",
  },
  gemini: {
    id: "gemini",
    title: "Gemini",
    apiKeyEnv: "GEMINI_API_KEY",
    baseURLEnv: "GEMINI_BASE_URL",
    modelEnv: "GEMINI_MODEL",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-3.5-flash",
    apiProtocol: "openai",
  },
  deepseek: {
    id: "deepseek",
    title: "DeepSeek",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    baseURLEnv: "DEEPSEEK_BASE_URL",
    modelEnv: "DEEPSEEK_MODEL",
    baseURL: "https://api.deepseek.com/anthropic",
    model: "deepseek-v4-flash",
    apiProtocol: "anthropic",
  },
};

const args = parseArgs(process.argv.slice(2));
const config = resolveProviderConfig(args.provider);
const reportPath = path.resolve(args.output ?? `docs/evals/rewrite-intent-expression-${todayStamp()}.md`);

if (!config) {
  await writeNoKeyReport(reportPath);
  console.log(`No supported provider API key was found. Wrote manual eval template: ${reportPath}`);
  process.exit(0);
}

const startedAt = new Date();
const results = [];

for (const sample of samples) {
  for (const variant of variants) {
    const started = Date.now();
    try {
      const raw = await generateWithProvider(config, variant.buildPrompt(sample.text), timeoutMs(), maxOutputTokens(), {
        responseMimeType: "application/json",
        responseJsonSchema: rewriteResponseSchema,
        temperature: 0,
      });
      const parsed = parseRewriteResult(raw);
      results.push({
        sample,
        variant,
        rewritten: parsed.rewritten,
        why: parsed.why,
        durationMs: Date.now() - started,
        error: "",
      });
    } catch (error) {
      results.push({
        sample,
        variant,
        rewritten: "",
        why: "",
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

await writeReport(reportPath, { config, startedAt, results });
console.log(`Wrote rewrite prompt eval report: ${reportPath}`);

function buildBaselinePrompt(text) {
  const system = [
    "You are a bilingual English writing coach for a Chinese native speaker who wants to sound like a natural English speaker.",
    "",
    "REWRITE RULES:",
    "Rewrite the selected text so it sounds natural, idiomatic, and conversational, like something a native English speaker would actually say.",
    "If the selected text is in English, rewrite it in natural, everyday English. Keep the original meaning, intent, and level of politeness. Prefer everyday wording over stiff, formal, or textbook phrasing. Do not add new information. If the text is already natural, make only minimal edits.",
    "If the selected text is in Chinese, render it as how a native English speaker would naturally express the same idea - not a literal or word-for-word translation, but the way someone would actually say it in English in real life. Match the tone, register, and politeness of the original. Do not add new information.",
    `TONE: ${rewriteToneInstructions.natural}`,
    "",
    "COACHING:",
    "After rewriting, explain in Simplified Chinese why your version sounds more natural than the original. Point out the specific changes - word choice, collocations, idioms, sentence rhythm, register - and name the typical Chinese-learner habit each change fixes. Quote the English snippets you discuss. Be concrete and concise: 2 to 5 short bullet points.",
    "",
    "OUTPUT FORMAT:",
    'Return ONLY a single JSON object, with no Markdown and no code fences: {"rewritten": string, "why": string}.',
    '"rewritten" must contain only the rewritten text itself - no labels, no surrounding quotation marks, no Markdown.',
    '"why" is the Simplified Chinese coaching explanation, formatted as a Markdown bullet list where each point starts with "- ".',
  ].join("\n");
  return { system, user: ["Selected text:", text].join("\n") };
}

function buildCandidateAPrompt(text) {
  const system = [
    "You are a bilingual English expression coach for Chinese speakers.",
    "",
    "CORE TASK:",
    "Write the exact English wording the user could say or send in the situation. For Chinese input, treat the source as communicative intent, not a sentence to mirror.",
    "",
    "INTENT-EXPRESSION RULES:",
    'If the Chinese source says the user wants to say, remind, ask, or explain something, write the actual utterance. Do not write meta language such as "I want to tell..." or "I would like to say..." unless those words are truly meant to be spoken.',
    "Address the listener directly when appropriate.",
    "Preserve practical constraints exactly: deadlines, requested actions, permissions, conditions, responsibility, and degree of urgency.",
    "Keep the original tone and politeness level, but use concise idiomatic English instead of Chinese-style layered politeness.",
    'For polite requests, prefer clear modal forms such as "Could you..." or "Would it be possible..." over stacked hedges.',
    "Do not add unsupported greetings, openers, names, titles, placeholders, apologies, sign-offs, promises, excuses, concessions, room numbers, reasons, or new facts.",
    'Do not start with "Hi", "Hey", "Dear", "Sorry to bother you", or similar openers unless the source explicitly includes them.',
    "Avoid Chinese calques, textbook phrasing, and overly formal wording unless the source clearly requires it.",
    "If the selected text is already English, lightly rewrite it using the same rules. If it is already natural, make only minimal edits.",
    `TONE: ${rewriteToneInstructions.natural}`,
    "",
    "COACHING:",
    "After rewriting, explain in Simplified Chinese why your version sounds more natural. Focus on concrete choices in word choice, register, rhythm, and avoided Chinese-to-English calques. Be concise: 2 to 5 short bullet points.",
    "",
    "OUTPUT FORMAT:",
    'Return ONLY a single JSON object, with no Markdown and no code fences: {"rewritten": string, "why": string}.',
    '"rewritten" must contain only the final English wording itself - no labels, no quotes, no Markdown.',
    '"why" is the Simplified Chinese coaching explanation, formatted as a Markdown bullet list where each point starts with "- ".',
  ].join("\n");
  return { system, user: ["Selected text:", text].join("\n") };
}

function buildCandidateBPrompt(text) {
  const system = [
    "You are a bilingual English writing coach for a Chinese native speaker who wants to sound natural in English.",
    "",
    "REWRITE RULES:",
    "Rewrite the selected text into natural, idiomatic English that fits the situation.",
    "If the selected text is English, keep the meaning and politeness level, prefer everyday wording, and make only minimal edits when it is already natural.",
    "If the selected text is Chinese, read it as the user's intended message rather than as wording to translate word for word.",
    'When the Chinese input says "I want to say/remind/ask/explain/tell someone...", output the message the user should actually say to that person. Do not output "I want to say...".',
    "Address the listener directly when appropriate.",
    "Preserve concrete constraints such as deadlines, requested actions, permissions, conditions, responsibility, and degree of urgency.",
    'Do not soften or generalize deadlines: "by this afternoon" must not become "by the end of the day", "sometime today", or "ideally this afternoon".',
    "Do not add greetings, openers, apologies, titles, name placeholders, sign-offs, excuses, concessions, or facts that the source did not provide.",
    'Do not start with "Hi", "Hey", "Dear", "Sorry to bother you", or similar openers unless the source explicitly includes them.',
    "Start with the substantive message, not a greeting. This applies even in service, hotel, email, and workplace contexts.",
    'Do not add phrases like "No worries if not" or "No rush" when the source gives a deadline or requested action.',
    "Keep polite requests clear and concise, using direct modal forms where they fit.",
    "Avoid Chinese calques, textbook phrasing, and overly formal wording unless the source clearly requires it.",
    `TONE: ${rewriteToneInstructions.natural}`,
    "",
    "COACHING:",
    "After rewriting, explain in Simplified Chinese why your version sounds more natural. Be concrete and concise: 2 to 5 short bullet points.",
    "",
    "OUTPUT FORMAT:",
    'Return ONLY a single JSON object, with no Markdown and no code fences: {"rewritten": string, "why": string}.',
    '"rewritten" must contain only the final English wording itself - no labels, no surrounding quotation marks, no Markdown.',
    '"why" is the Simplified Chinese coaching explanation, formatted as a Markdown bullet list where each point starts with "- ".',
  ].join("\n");
  return { system, user: ["Selected text:", text].join("\n") };
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === "--provider") parsed.provider = rawArgs[++i];
    else if (arg === "--output") parsed.output = rawArgs[++i];
  }
  return parsed;
}

function resolveProviderConfig(requestedProvider) {
  const requested = requestedProvider ? [requestedProvider] : ["mimo", "openai", "gemini", "deepseek"];
  for (const id of requested) {
    const defaults = providerDefaults[id];
    if (!defaults) continue;
    const apiKey = process.env[defaults.apiKeyEnv];
    if (!apiKey) continue;
    return {
      id: defaults.id,
      title: defaults.title,
      apiKey,
      baseURL: process.env[defaults.baseURLEnv] || defaults.baseURL,
      model: process.env.EVAL_MODEL || process.env[defaults.modelEnv] || defaults.model,
      apiProtocol: defaults.apiProtocol,
    };
  }
  return undefined;
}

function timeoutMs() {
  const value = Number.parseInt(process.env.EVAL_TIMEOUT_SECONDS ?? "", 10);
  return (Number.isFinite(value) ? value : 45) * 1000;
}

function maxOutputTokens() {
  const value = Number.parseInt(process.env.EVAL_MAX_OUTPUT_TOKENS ?? "", 10);
  return Number.isFinite(value) ? value : 1200;
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

async function writeNoKeyReport(outputPath) {
  const lines = [
    "# Rewrite Intent-Expression Prompt Eval",
    "",
    `Date: ${new Date().toISOString()}`,
    "",
    "No supported provider API key was found in the environment, so this file is a manual eval template.",
    "",
    "| Sample | Source | Baseline | Candidate A | Candidate B | Notes |",
    "| --- | --- | --- | --- | --- | --- |",
    ...samples.map((sample) => `| ${sample.label} | ${escapeTable(sample.text)} |  |  |  |  |`),
    "",
    "Rubric: Native English, Intent fidelity, No Chinese calque, Direct utterance, Register fit, No unsupported addition, Brevity. Score each item 1-5.",
  ];
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function writeReport(outputPath, { config, startedAt, results }) {
  const grouped = new Map();
  for (const result of results) {
    const key = result.sample.id;
    if (!grouped.has(key)) grouped.set(key, { sample: result.sample, byVariant: new Map() });
    grouped.get(key).byVariant.set(result.variant.id, result);
  }

  const lines = [
    "# Rewrite Intent-Expression Prompt Eval",
    "",
    `Date: ${startedAt.toISOString()}`,
    `Provider: ${config.title}`,
    `Model: ${config.model}`,
    "Temperature: 0",
    "",
    "Rubric: Native English, Intent fidelity, No Chinese calque, Direct utterance, Register fit, No unsupported addition, Brevity. Score each item 1-5.",
    "",
  ];

  for (const { sample, byVariant } of grouped.values()) {
    lines.push(`## ${sample.label}`, "", `Source: ${sample.text}`, "");
    for (const variant of variants) {
      const result = byVariant.get(variant.id);
      lines.push(`### ${variant.title}`, "");
      if (!result || result.error) {
        lines.push(`Error: ${result?.error ?? "missing result"}`, "");
        continue;
      }
      lines.push(result.rewritten, "", `Duration: ${result.durationMs} ms`, "", "Why:", "", result.why, "");
    }
  }

  lines.push("## Manual Scoring", "");
  lines.push(
    "| Sample | Variant | Native English | Intent fidelity | No Chinese calque | Direct utterance | Register fit | No unsupported addition | Brevity | Total | Notes |",
  );
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
  for (const sample of samples) {
    for (const variant of variants) {
      lines.push(`| ${sample.label} | ${variant.title} |  |  |  |  |  |  |  |  |  |`);
    }
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function escapeTable(value) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}
