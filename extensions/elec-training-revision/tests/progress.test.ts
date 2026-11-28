import assert from "node:assert/strict";
import test from "node:test";
import { questions, topics } from "../src/data/questions";
import { emptyProgress, makeSession, parseProgress, recordAnswer, summarize } from "../src/lib/progress";

test("a mistake remains reviewable until the latest answer is correct", () => {
  const q = questions[0];
  const wrong = (q.answer + 1) % q.options.length;
  const first = recordAnswer(emptyProgress(), q, wrong);
  assert.equal(summarize(first).missed, 1);
  const second = recordAnswer(first, q, q.answer);
  assert.deepEqual(summarize(second), { attempts: 2, correct: 1, seen: 1, missed: 0, accuracy: 50 });
  assert.equal(first.questions[q.id].attempts, 1, "updates must not mutate previous history");
  assert.equal(summarize(recordAnswer(second, q, wrong)).missed, 1);
});

test("saved history survives a round trip and unknown question IDs do not affect scores", () => {
  const progress = recordAnswer(emptyProgress(), questions[0], questions[0].answer, new Date("2026-11-28T00:00:00Z"));
  assert.deepEqual(parseProgress(JSON.stringify(progress)), progress);
  const modified = { ...progress, questions: { ...progress.questions, retired: progress.questions[questions[0].id] } };
  assert.deepEqual(parseProgress(JSON.stringify(modified)), progress);
  assert.deepEqual(parseProgress(undefined), emptyProgress());
});

test("invalid saved data is rejected rather than silently replacing history", () => {
  for (const raw of [
    "broken",
    "null",
    '{"version":2,"questions":{}}',
    '{"version":1,"questions":{"ohm-01":{"attempts":-1}}}',
  ])
    assert.throws(() => parseProgress(raw));
  for (const selected of [-1, 4, 0.5, NaN]) assert.throws(() => recordAnswer(emptyProgress(), questions[0], selected));
});

test("mixed and topic sessions contain unique questions without changing the bank", () => {
  const before = questions.map((q) => q.id);
  const session = makeSession(questions);
  assert.equal(session.length, 8);
  assert.equal(new Set(session.map((q) => q.id)).size, 8);
  assert.deepEqual(
    questions.map((q) => q.id),
    before,
  );
  for (const topic of topics) {
    const pool = questions.filter((q) => q.topic === topic);
    assert.equal(makeSession(pool).length, 8);
    assert.equal(summarize(emptyProgress(), pool).attempts, 0);
  }
  assert.deepEqual(makeSession([]), []);
  assert.equal(makeSession(questions.slice(0, 2)).length, 2);
});

test("question bank contains valid unique choices and a balanced correct-answer position", () => {
  assert.equal(questions.length, 24);
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
  const answerPositions = [0, 0, 0, 0];
  for (const q of questions) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.answer >= 0 && q.answer < 4);
    answerPositions[q.answer]++;
  }
  assert.deepEqual(answerPositions, [6, 6, 6, 6]);
});
