import assert from "node:assert/strict";
import test from "node:test";
import {
  buildModeSummaries,
  buildModelSummaries,
  classifyResultScore,
  detectQualityWarnings,
  renderMarkdownReport,
  validateManualMessages,
  validateManualModes,
  type EvaluationReport,
} from "../scripts/evaluate-rewrites.ts";
import {
  buildManualEvalModes,
  validateManualModels,
} from "../scripts/generate-manual-eval-modes.ts";
import { LANGUAGE_PRESETS } from "../src/tones.ts";

test("manual eval validates editable messages and modes", () => {
  assert.deepEqual(validateManualMessages([" Привет ", "Нужно поправить"]), [
    "Привет",
    "Нужно поправить",
  ]);

  assert.deepEqual(
    validateManualModes([
      {
        title: "Коллегам",
        provider: "ollama",
        model: "qwen3:14b",
        systemPrompt: "Перепиши текст.",
        temperature: 0.2,
        maxTokens: 4096,
      },
    ]),
    [
      {
        id: "mode-1",
        title: "Коллегам",
        provider: "ollama",
        model: "qwen3:14b",
        systemPrompt: "Перепиши текст.",
        temperature: 0.2,
        maxTokens: 4096,
      },
    ],
  );

  assert.throws(() => validateManualMessages([""]), /messages\.json\[0\]/);
  assert.throws(
    () =>
      validateManualModes([
        {
          title: "Bad",
          provider: "unknown",
          model: "model",
          systemPrompt: "Prompt",
          temperature: 0.2,
          maxTokens: 100,
        },
      ]),
    /modes\.json\[0\]\.provider/,
  );
});

test("manual eval generates modes from editable Ollama model list", () => {
  assert.deepEqual(
    validateManualModels([" qwen3:14b ", "gemma3:12b", "qwen3:14b"]),
    ["qwen3:14b", "gemma3:12b"],
  );
  assert.throws(() => validateManualModels([""]), /models\.json\[0\]/);

  const modes = buildManualEvalModes(
    [
      {
        id: "fix-errors",
        title: "Исправить ошибки",
        subtitle: "Минимальная корректура",
      },
      {
        id: "work-chat",
        title: "Рабочий чат",
        subtitle: "Для рабочих сообщений",
      },
    ],
    {
      "fix-errors": "Исправь ошибки.",
      "work-chat": "Сделай рабочим.",
    },
    ["qwen3:14b", "gemma3:12b"],
  );

  assert.deepEqual(
    modes.map(({ id, title, provider, model, systemPrompt }) => ({
      id,
      title,
      provider,
      model,
      systemPrompt,
    })),
    [
      {
        id: "fix-errors__qwen3-14b",
        title: "Исправить ошибки / qwen3:14b",
        provider: "ollama",
        model: "qwen3:14b",
        systemPrompt: "Исправь ошибки.",
      },
      {
        id: "work-chat__qwen3-14b",
        title: "Рабочий чат / qwen3:14b",
        provider: "ollama",
        model: "qwen3:14b",
        systemPrompt: "Сделай рабочим.",
      },
      {
        id: "fix-errors__gemma3-12b",
        title: "Исправить ошибки / gemma3:12b",
        provider: "ollama",
        model: "gemma3:12b",
        systemPrompt: "Исправь ошибки.",
      },
      {
        id: "work-chat__gemma3-12b",
        title: "Рабочий чат / gemma3:12b",
        provider: "ollama",
        model: "gemma3:12b",
        systemPrompt: "Сделай рабочим.",
      },
    ],
  );
  assert.ok(
    modes.every(({ temperature, maxTokens }) => {
      return temperature === 0.2 && maxTokens === 4096;
    }),
  );
});

test("manual eval generation uses the inline emoji preset prompt", () => {
  const preset = LANGUAGE_PRESETS.ru;
  const modes = buildManualEvalModes(
    preset.styles,
    preset.prompts,
    ["qwen3:14b"],
  );
  const emojiMode = modes.find(({ id }) => id === "emoji__qwen3-14b");

  assert.ok(emojiMode);
  assert.match(emojiMode.systemPrompt, /сначала ищи.*внутри предложения/i);
  assert.match(emojiMode.systemPrompt, /конец предложения.*не.*позици/i);
  assert.match(emojiMode.systemPrompt, /на весь текст/i);
  assert.match(
    emojiMode.systemPrompt,
    /Не делай так:.*Ориентир по расположению:/i,
  );
});

test("manual eval renders comparison markdown without secrets", () => {
  const report: EvaluationReport = {
    generatedAt: "2026-07-06T10:00:00.000Z",
    messages: [
      "Привет, проверь пожалуйста текст",
      "Проверь договор и напиши если будут вопросы",
    ],
    modes: [
      {
        id: "mode-1",
        title: "Коллегам",
        provider: "ollama",
        model: "qwen3:14b",
        systemPrompt: "Перепиши текст.",
        temperature: 0.2,
        maxTokens: 4096,
      },
      {
        id: "mode-2",
        title: "OpenAI",
        provider: "openai",
        model: "gpt-4o-mini",
        systemPrompt: "Перепиши текст.",
        temperature: 0.2,
        maxTokens: 4096,
      },
    ],
    results: [
      {
        messageIndex: 0,
        modeId: "mode-1",
        modeTitle: "Коллегам",
        provider: "ollama",
        model: "qwen3:14b",
        status: "ok",
        durationMs: 1234,
        output: "Привет, пожалуйста, проверь текст.",
      },
      {
        messageIndex: 1,
        modeId: "mode-1",
        modeTitle: "Коллегам",
        provider: "ollama",
        model: "qwen3:14b",
        status: "ok",
        durationMs: 1000,
        output: "Я могу помочь. Пожалуйста, предоставьте текст договора.",
        qualityWarning: {
          categories: ["assistant-response"],
          details: [
            "Output looks like an assistant response instead of a rewrite.",
          ],
        },
      },
      {
        messageIndex: 0,
        modeId: "mode-2",
        modeTitle: "OpenAI",
        provider: "openai",
        model: "gpt-4o-mini",
        status: "error",
        durationMs: 250,
        error: "API error: [REDACTED]",
      },
      {
        messageIndex: 1,
        modeId: "mode-2",
        modeTitle: "OpenAI",
        provider: "openai",
        model: "gpt-4o-mini",
        status: "ok",
        durationMs: 500,
        output: "Проверьте договор и напишите, если возникнут вопросы.",
      },
    ],
  };

  const markdown = renderMarkdownReport(report, ["secret-key"]);

  assert.match(markdown, /# WordingKit Rewrite Evaluation/);
  assert.match(markdown, /## Model Summary/);
  assert.match(
    markdown,
    /\| qwen3:14b \| ollama \| 2 \| 0 \| 1 \| 0 \| 1 \| 1117 ms \| 1117 ms \| 0 \| 1 \| 0 \| 0 \| 0 \| 0 \| 1 \|/,
  );
  assert.match(
    markdown,
    /\| gpt-4o-mini \| openai \| 1 \| 1 \| 1 \| 0 \| 1 \| 375 ms \| 375 ms \| 0 \| 0 \| 0 \| 0 \| 0 \| 0 \| 0 \|/,
  );
  assert.match(markdown, /## Mode Summary/);
  assert.match(
    markdown,
    /\| Коллегам \| 2 \| 0 \| 1 \| 0 \| 1 \| 1117 ms \| 1117 ms \| 0 \| 1 \| 0 \| 0 \| 0 \| 0 \| 1 \|/,
  );
  assert.match(markdown, /## Message 1/);
  assert.match(markdown, /### Коллегам/);
  assert.match(markdown, /Provider: `ollama`/);
  assert.match(markdown, /Duration: `1234 ms`/);
  assert.match(markdown, /Score: `ok`/);
  assert.match(markdown, /Score: `bad`/);
  assert.match(markdown, /Quality warning: `assistant-response`/);
  assert.match(markdown, /Привет, пожалуйста, проверь текст\./);
  assert.match(markdown, /Duration: `250 ms`/);
  assert.match(markdown, /API error: \[REDACTED\]/);
  assert.doesNotMatch(markdown, /secret-key/);
});

test("manual eval renders long text blocks without fenced code scrolling", () => {
  const longMessage =
    "Проверь manual-eval report и убедись, что длинный текст с WordingKit, Raycast, Ollama, GitLab MR и npm scripts переносится в Markdown без горизонтального скролла.";
  const report: EvaluationReport = {
    generatedAt: "2026-07-06T10:00:00.000Z",
    messages: [longMessage],
    modes: [
      {
        id: "mode-1",
        title: "Рабочий чат",
        provider: "ollama",
        model: "qwen3:14b",
        systemPrompt: "Перепиши текст.",
        temperature: 0.2,
        maxTokens: 4096,
      },
    ],
    results: [
      {
        messageIndex: 0,
        modeId: "mode-1",
        modeTitle: "Рабочий чат",
        provider: "ollama",
        model: "qwen3:14b",
        status: "ok",
        durationMs: 100,
        output: longMessage,
      },
    ],
  };

  const markdown = renderMarkdownReport(report);

  assert.doesNotMatch(markdown, /```text/);
  assert.match(markdown, new RegExp(`> ${longMessage}`));
});

test("manual eval detects quality warnings and builds summaries", () => {
  const original = "Проверь договор";
  const longOutput = `${original} ${"очень ".repeat(30)}`;

  assert.deepEqual(detectQualityWarnings("正常 text", original), {
    categories: ["language-mismatch"],
    details: ["Output contains Chinese characters."],
  });
  assert.deepEqual(
    detectQualityWarnings(
      "Я могу помочь. Следующие шаги: предоставьте текст.",
      "Проверь договор и напиши, если будут вопросы по срокам согласования",
    ),
    {
      categories: ["assistant-response"],
      details: [
        "Output looks like an assistant response instead of a rewrite.",
      ],
    },
  );
  assert.equal(
    detectQualityWarnings(
      "Пожалуйста, предоставьте текст договора, и я могу помочь.",
      "Пожалуйста, предоставьте текст договора, и я могу помочь.",
    ),
    undefined,
  );
  assert.deepEqual(
    detectQualityWarnings(
      "Please check the contract and send me your feedback.",
      "Проверь договор и пришли обратную связь.",
    ),
    {
      categories: ["english-sentence"],
      details: [
        "Output contains full English sentences while the original is Russian.",
      ],
    },
  );
  assert.deepEqual(
    detectQualityWarnings('```json\n{"ticket":"ABC-123"}\n```', original),
    {
      categories: ["placeholder", "added-code-block", "added-ticket-id"],
      details: [
        "Output contains placeholders or signature-like template text.",
        "Output added a JSON or code block that was not present in the original.",
        "Output added ticket-like IDs that were not present in the original.",
      ],
    },
  );
  assert.deepEqual(detectQualityWarnings("Добрый день, [Ваше имя]", original), {
    categories: ["placeholder"],
    details: ["Output contains placeholders or signature-like template text."],
  });
  assert.deepEqual(detectQualityWarnings(longOutput, original), {
    categories: ["too-long"],
    details: ["Output is more than 2.5x longer than the original message."],
  });
  assert.equal(classifyResultScore(undefined), "ok");
  assert.equal(
    classifyResultScore({
      categories: ["placeholder"],
      details: [
        "Output contains placeholders or signature-like template text.",
      ],
    }),
    "warning",
  );
  assert.equal(
    classifyResultScore({
      categories: ["assistant-response"],
      details: [
        "Output looks like an assistant response instead of a rewrite.",
      ],
    }),
    "bad",
  );

  const report: EvaluationReport = {
    generatedAt: "2026-07-06T10:00:00.000Z",
    messages: [original],
    modes: [],
    results: [
      {
        messageIndex: 0,
        modeId: "mode-1",
        modeTitle: "Коллегам",
        provider: "ollama",
        model: "qwen3:14b",
        status: "ok",
        durationMs: 100,
        output: "Проверь договор.",
      },
      {
        messageIndex: 0,
        modeId: "mode-2",
        modeTitle: "Коллегам",
        provider: "ollama",
        model: "qwen3:14b",
        status: "error",
        durationMs: 200,
        error: "Ollama returned an empty response",
      },
      {
        messageIndex: 0,
        modeId: "mode-3",
        modeTitle: "Коллегам",
        provider: "ollama",
        model: "qwen3:14b",
        status: "ok",
        durationMs: 300,
        qualityWarning: {
          categories: ["language-mismatch", "too-long"],
          details: ["Output contains Chinese characters."],
        },
        output: longOutput,
      },
      {
        messageIndex: 0,
        modeId: "mode-4",
        modeTitle: "Рабочий чат / qwen3:14b",
        provider: "ollama",
        model: "qwen3:14b",
        status: "ok",
        durationMs: 400,
        qualityWarning: {
          categories: ["english-sentence", "added-ticket-id"],
          details: [
            "Output contains full English sentences while the original is Russian.",
          ],
        },
        output: "The contract is blocked by JIRA-1234.",
      },
    ],
  };

  const summaries = buildModelSummaries(report);

  assert.deepEqual(summaries, [
    {
      provider: "ollama",
      model: "qwen3:14b",
      ok: 3,
      error: 1,
      averageDurationMs: 250,
      medianDurationMs: 250,
      languageWarnings: 1,
      tooLongWarnings: 1,
      assistantResponseWarnings: 0,
      englishSentenceWarnings: 1,
      addedCodeBlockWarnings: 0,
      addedTicketIdWarnings: 1,
      qualityWarnings: 2,
      scoreOk: 1,
      scoreWarning: 0,
      scoreBad: 3,
    },
  ]);

  assert.deepEqual(buildModeSummaries(report), [
    {
      modeTitle: "Коллегам",
      ok: 2,
      error: 1,
      averageDurationMs: 200,
      medianDurationMs: 200,
      languageWarnings: 1,
      tooLongWarnings: 1,
      assistantResponseWarnings: 0,
      englishSentenceWarnings: 0,
      addedCodeBlockWarnings: 0,
      addedTicketIdWarnings: 0,
      qualityWarnings: 1,
      scoreOk: 1,
      scoreWarning: 0,
      scoreBad: 2,
    },
    {
      modeTitle: "Рабочий чат",
      ok: 1,
      error: 0,
      averageDurationMs: 400,
      medianDurationMs: 400,
      languageWarnings: 0,
      tooLongWarnings: 0,
      assistantResponseWarnings: 0,
      englishSentenceWarnings: 1,
      addedCodeBlockWarnings: 0,
      addedTicketIdWarnings: 1,
      qualityWarnings: 1,
      scoreOk: 0,
      scoreWarning: 0,
      scoreBad: 1,
    },
  ]);
});
