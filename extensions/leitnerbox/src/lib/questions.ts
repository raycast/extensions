import { LocalStorage } from "@raycast/api";
import { Question } from "../types";

const boxIntervalsInDays: Record<number, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 8,
  4: 10,
  5: -1,
};

export type QuestionSummary = {
  id: string;
  question: string;
  answer?: string;
  box: number;
  lastReviewedAt: string;
  daysUntilDue: number | null;
  due: boolean;
};

export function createQuestion(question: string, answer: string): Question {
  return {
    id: generateQuickGuid(),
    question,
    answer,
    date: new Date(),
    box: 0,
  };
}

export async function saveQuestion(question: Question) {
  await LocalStorage.setItem(question.id, JSON.stringify(question));
}

export async function getQuestions() {
  const storedQuestions = await LocalStorage.allItems();

  return Object.values(storedQuestions)
    .map(parseQuestion)
    .filter((question): question is Question => question !== undefined);
}

export function summarizeQuestion(
  question: Question,
  options?: { includeAnswer?: boolean; today?: Date },
): QuestionSummary {
  const today = options?.today ?? new Date();
  const daysUntilDue = getDaysUntilDue(question, today);

  return {
    id: question.id,
    question: question.question,
    ...(options?.includeAnswer ? { answer: question.answer } : {}),
    box: question.box,
    lastReviewedAt: question.date.toISOString(),
    daysUntilDue,
    due: daysUntilDue !== null && daysUntilDue <= 0,
  };
}

export function getDaysUntilDue(question: Question, today = new Date()) {
  const interval = boxIntervalsInDays[question.box];

  if (interval === undefined || interval < 0) {
    return null;
  }

  const daysSinceReview = Math.round((today.getTime() - question.date.getTime()) / (1000 * 60 * 60 * 24));
  return interval - daysSinceReview;
}

function parseQuestion(value: unknown) {
  try {
    if (typeof value !== "string") {
      return undefined;
    }

    const parsed = JSON.parse(value) as Partial<Question> & { date?: string };
    const date = parsed.date ? new Date(parsed.date) : undefined;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.question !== "string" ||
      typeof parsed.answer !== "string" ||
      typeof parsed.box !== "number" ||
      !date ||
      Number.isNaN(date.getTime())
    ) {
      return undefined;
    }

    return {
      id: parsed.id,
      question: parsed.question,
      answer: parsed.answer,
      box: parsed.box,
      date,
    };
  } catch {
    return undefined;
  }
}

function generateQuickGuid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
