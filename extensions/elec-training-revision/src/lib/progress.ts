import { Question, questions } from "../data/questions";

export interface QuestionProgress {
  attempts: number;
  correct: number;
  lastCorrect: boolean;
  lastAnswered: string;
}
export interface Progress {
  version: 1;
  questions: Record<string, QuestionProgress>;
}
export const emptyProgress = (): Progress => ({ version: 1, questions: {} });

export function parseProgress(raw: string | undefined): Progress {
  if (!raw) return emptyProgress();
  const value: unknown = JSON.parse(raw);
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 1 ||
    !("questions" in value) ||
    typeof value.questions !== "object" ||
    value.questions === null
  ) {
    throw new Error("Saved progress has an unsupported format.");
  }
  const clean = emptyProgress();
  for (const q of questions) {
    const record = (value.questions as Record<string, unknown>)[q.id];
    if (record === undefined) continue;
    if (typeof record !== "object" || record === null) throw new Error("Saved question progress is invalid.");
    const r = record as QuestionProgress;
    if (
      !Number.isInteger(r.attempts) ||
      r.attempts < 1 ||
      !Number.isInteger(r.correct) ||
      r.correct < 0 ||
      r.correct > r.attempts ||
      typeof r.lastCorrect !== "boolean" ||
      typeof r.lastAnswered !== "string" ||
      !Number.isFinite(Date.parse(r.lastAnswered))
    ) {
      throw new Error("Saved question progress is invalid.");
    }
    clean.questions[q.id] = {
      attempts: r.attempts,
      correct: r.correct,
      lastCorrect: r.lastCorrect,
      lastAnswered: r.lastAnswered,
    };
  }
  return clean;
}

export function recordAnswer(progress: Progress, question: Question, selected: number, now = new Date()): Progress {
  if (!Number.isInteger(selected) || selected < 0 || selected >= question.options.length)
    throw new Error("Choose a valid answer.");
  const previous = progress.questions[question.id];
  const correct = selected === question.answer;
  return {
    version: 1,
    questions: {
      ...progress.questions,
      [question.id]: {
        attempts: (previous?.attempts ?? 0) + 1,
        correct: (previous?.correct ?? 0) + Number(correct),
        lastCorrect: correct,
        lastAnswered: now.toISOString(),
      },
    },
  };
}

export function summarize(progress: Progress, pool: readonly Question[] = questions) {
  let attempts = 0,
    correct = 0,
    seen = 0,
    missed = 0;
  for (const q of pool) {
    const p = progress.questions[q.id];
    if (!p) continue;
    seen++;
    attempts += p.attempts;
    correct += p.correct;
    if (!p.lastCorrect) missed++;
  }
  return { attempts, correct, seen, missed, accuracy: attempts ? Math.round((correct / attempts) * 100) : 0 };
}

export function makeSession(pool: readonly Question[], size = 8, random: () => number = Math.random): Question[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.max(0, Math.floor(size)));
}
