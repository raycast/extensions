import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildTranslationPrompt } = await jiti.import("../src/prompt.ts");

test("translation prompt remains meaning-first translation, not rewrite coaching", () => {
  const prompt = buildTranslationPrompt({
    text: "我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。",
    targetLanguage: "en",
    targetLanguageTitle: "English",
    style: "balanced",
    promptProfile: "general",
    timeoutMs: 1000,
    maxOutputTokens: 256,
  });

  assert.match(prompt.system, /professional AI translator/);
  assert.match(prompt.system, /Translate complete sentences and paragraphs by meaning/);
  assert.match(prompt.system, /SkillOpt-style validation gate/);
  assert.match(prompt.system, /faithfulness gate/);
  assert.match(prompt.system, /output gate: final response is the translation only/);
  assert.doesNotMatch(prompt.system, /output the message the user should actually say/);
  assert.doesNotMatch(prompt.system, /Do not start with "Hi"/);
  assert.doesNotMatch(prompt.system, /cross-language expression coach/);
  assert.doesNotMatch(prompt.user, /Intention:/);
});
