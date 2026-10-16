import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findLanguage, languageTitle, parseTargetSuffix } from "../src/lib/languages";
import { formatUsd, modelLabel, tokenCost } from "../src/lib/models";
import { BUILTIN_COMMANDS, renderPrompt } from "../src/lib/presets";
import {
  codeBlocks,
  fold,
  guessLanguageCode,
  isShortPhrase,
  markdownToPlain,
  preserveWhitespace,
  stripWrapping,
} from "../src/lib/text";

const zero = { input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };

describe("text", () => {
  it("keeps the selection's surrounding whitespace", () => {
    assert.equal(preserveWhitespace("  hello\n", "merhaba"), "  merhaba\n");
    assert.equal(preserveWhitespace("hello", "\nmerhaba\n"), "merhaba");
    assert.equal(preserveWhitespace("\n\n", "x"), "x");
  });

  it("strips wrappers the model added, but not ones the user had", () => {
    assert.equal(stripWrapping('"Merhaba dünya"', "Hello world"), "Merhaba dünya");
    assert.equal(stripWrapping('"Merhaba"', '"Hello"'), '"Merhaba"');
    assert.equal(stripWrapping("```\nconst a = 1;\n```", "const a = 1;"), "const a = 1;");
    assert.equal(stripWrapping("```js\nx\n```", "```js\nx\n```"), "```js\nx\n```");
    assert.equal(stripWrapping('"a" and "b"', "x"), '"a" and "b"');
  });

  it("folds Turkish casing and accents for matching", () => {
    assert.equal(fold("İngilizce"), "ingilizce");
    assert.equal(fold("INDONESIAN"), "indonesian");
    assert.equal(fold("Türkçe"), "turkce");
    assert.equal(fold("ışık"), "isik");
  });

  it("detects short dictionary lookups", () => {
    assert.equal(isShortPhrase("serendipity"), true);
    assert.equal(isShortPhrase("take off"), true);
    assert.equal(isShortPhrase("This is a whole sentence."), false);
    assert.equal(isShortPhrase("line one\nline two"), false);
  });

  it("turns Markdown into plain text", () => {
    const md = "## Başlık\n\n**kalın** ve *eğik* ve `kod`\n\n- bir\n- iki\n\n[link](https://x.y)";
    assert.equal(markdownToPlain(md), "Başlık\n\nkalın ve eğik ve kod\n\n• bir\n• iki\n\nlink (https://x.y)");
  });

  it("extracts fenced code blocks", () => {
    assert.deepEqual(codeBlocks("a\n```sh\nls -la\n```\nb\n```\nx\ny\n```"), ["ls -la", "x\ny"]);
  });

  it("guesses a voice language", () => {
    assert.equal(guessLanguageCode("Bugün hava çok güzel"), "tr");
    assert.equal(guessLanguageCode("The weather is lovely today"), "en");
    assert.equal(guessLanguageCode("Привет мир"), undefined);
  });
});

describe("languages", () => {
  it("finds languages by any name, code or casing", () => {
    for (const key of ["English", "en", "english", "ENGLISH"]) {
      assert.equal(findLanguage(key)?.value, "English", key);
    }
    assert.equal(findLanguage("deutsch")?.code, "de");
    assert.equal(findLanguage("TÜRKÇE")?.value, "Turkish");
    assert.equal(findLanguage("klingon"), undefined);
    assert.equal(languageTitle("ja"), "Japanese");
  });

  it("parses a trailing >language suffix", () => {
    assert.deepEqual(
      (({ text, language }) => ({ text, code: language.code }))(parseTargetSuffix("merhaba dünya >ja")!),
      { text: "merhaba dünya", code: "ja" },
    );
    assert.equal(parseTargetSuffix("hello > german")?.language.code, "de");
    assert.equal(parseTargetSuffix("a > b"), null);
    assert.equal(parseTargetSuffix(">de"), null);
    assert.equal(parseTargetSuffix("x => y"), null);
  });

});

describe("models", () => {
  it("prices tokens per model", () => {
    assert.equal(tokenCost("claude-opus-5-5", { ...zero, input: 1_000_000 }), 4);
    assert.equal(tokenCost("claude-opus-5-5", { ...zero, output: 1_000_000 }), 20);
    assert.equal(tokenCost("claude-opus-5-5", { ...zero, cacheRead: 1_000_000 }), 0.2);
    assert.equal(tokenCost("claude-opus-5-5", { ...zero, cacheWrite5m: 1_000_000 }), 5);
    assert.equal(tokenCost("claude-opus-5-5", { ...zero, cacheWrite1h: 1_000_000 }), 8);
    assert.equal(tokenCost("claude-sonnet-5-5", { ...zero, input: 1_000_000, output: 1_000_000 }), 12);
    assert.equal(tokenCost("claude-fable-5-1", { ...zero, output: 1_000_000 }), 50);
  });

  it("switches Haiku 5.5 to its long-prompt rate card above 100K", () => {
    assert.ok(Math.abs(tokenCost("claude-haiku-5-5", { ...zero, input: 100_000 }) - 0.01) < 1e-12);
    assert.ok(Math.abs(tokenCost("claude-haiku-5-5", { ...zero, input: 200_000 }) - 0.1) < 1e-12);
  });

  it("prices fallback models and labels unknown ids", () => {
    assert.equal(tokenCost("claude-opus-4-8", { ...zero, input: 1_000_000 }), 5);
    assert.equal(modelLabel("claude-opus-4-8"), "Opus 4.8");
    assert.equal(modelLabel("claude-haiku-5-5"), "Haiku 5.5");
    assert.equal(formatUsd(0.00012), "$0.0001");
    assert.equal(formatUsd(1.5), "$1.50");
  });
});

describe("presets", () => {
  const langs = { primary: "Turkish", secondary: "English" };

  it("fills placeholders in one pass", () => {
    const command = { ...BUILTIN_COMMANDS[0], prompt: "Do {selection} in {language} for {target} {clipboard}" };
    const { prompt, inline } = renderPrompt(command, { selection: "$& {language}", clipboard: "{selection}", langs });
    assert.equal(inline, true);
    assert.equal(prompt, "Do $& {language} in Turkish for English {selection}");
  });

  it("tags the selection for replace mode", () => {
    const command = { ...BUILTIN_COMMANDS[0], prompt: "Fix {selection}" };
    assert.equal(renderPrompt(command, { selection: "x", langs, tagSelection: true }).prompt, "Fix <text>\nx\n</text>");
  });

  it("ships unique built-in commands with valid modes", () => {
    const ids = BUILTIN_COMMANDS.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const c of BUILTIN_COMMANDS) {
      assert.ok(["view", "replace", "copy"].includes(c.mode), c.id);
      assert.equal(c.builtin, true);
    }
  });
});
