import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { buildRewriteCoachPrompt, buildTranslationPrompt } = await jiti.import("../src/prompt.ts");

test("rewrite prompt treats Chinese meta-framing as communicative intent", () => {
  const prompt = buildRewriteCoachPrompt("我想跟外国同事说，这事不是你做得不好，是我们之前没有把要求讲清楚。");

  assert.match(prompt.system, /read it as the user's intended message/);
  assert.match(prompt.system, /output the message the user should actually say/);
  assert.match(prompt.system, /Do not output "I want to say/);
  assert.match(prompt.system, /Address the listener directly/);
});

test("rewrite prompt locks practical constraints and unsupported-addition guardrails", () => {
  const prompt = buildRewriteCoachPrompt("我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。");

  assert.match(prompt.system, /Preserve concrete constraints such as deadlines/);
  assert.match(prompt.system, /must not become "by the end of the day"/);
  assert.match(prompt.system, /Do not add greetings, openers, apologies/);
  assert.match(prompt.system, /Do not start with "Hi", "Hey", "Dear"/);
  assert.match(prompt.system, /Start with the substantive message/);
  assert.match(prompt.system, /Do not add phrases like "No worries if not" or "No rush"/);
  assert.match(prompt.system, /Could you/);
  assert.match(prompt.user, /今天下午之前把文件发我/);
});

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
  assert.doesNotMatch(prompt.system, /output the message the user should actually say/);
  assert.doesNotMatch(prompt.system, /Do not start with "Hi"/);
});
