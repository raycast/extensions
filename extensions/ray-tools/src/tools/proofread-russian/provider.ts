import { applyCorrections, mergeRussianContextIssues } from "./domain";
import type {
  ProofreadingIssue,
  ProofreadingIssueCategory,
  ProofreadingProvider,
  ProofreadingResult,
} from "./types";

const LANGUAGE_TOOL_ENDPOINT = "https://api.languagetool.org/v2/check";
const PROOFREADING_TIMEOUT_MS = 15_000;

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RecordValue)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function getIssueCategory(
  categoryId: unknown,
  issueType: unknown,
): ProofreadingIssueCategory {
  const category = asString(categoryId)?.toUpperCase() ?? "";
  const type = asString(issueType)?.toLowerCase() ?? "";

  if (category.includes("PUNCTUATION") || type.includes("punctuation")) {
    return "punctuation";
  }

  if (
    category.includes("TYPO") ||
    category.includes("SPELL") ||
    type.includes("spell") ||
    type.includes("misspell")
  ) {
    return "spelling";
  }

  if (category.includes("STYLE") || type.includes("style")) {
    return "style";
  }

  if (category.includes("GRAMMAR") || type.includes("grammar")) {
    return "grammar";
  }

  return "other";
}

export function parseLanguageToolResponse(
  payload: unknown,
): ProofreadingIssue[] {
  const response = asRecord(payload);
  if (!response || !Array.isArray(response.matches)) {
    throw new Error("Proofreading service returned an invalid response");
  }

  return response.matches.flatMap((rawMatch): ProofreadingIssue[] => {
    const match = asRecord(rawMatch);
    const message = asString(match?.message);
    const offset = asInteger(match?.offset);
    const length = asInteger(match?.length);

    if (!message || offset === undefined || length === undefined) {
      return [];
    }

    const replacements = Array.isArray(match?.replacements)
      ? match.replacements.flatMap((replacement) => {
          const value = asString(asRecord(replacement)?.value);
          return value === undefined ? [] : [value];
        })
      : [];
    const rule = asRecord(match?.rule);
    const category = asRecord(rule?.category);
    const shortMessage = asString(match?.shortMessage);
    const ruleId = asString(rule?.id);

    return [
      {
        message,
        ...(shortMessage ? { shortMessage } : {}),
        replacements,
        offset,
        length,
        category: getIssueCategory(category?.id, rule?.issueType),
        ...(ruleId ? { ruleId } : {}),
      },
    ];
  });
}

export class LanguageToolProvider implements ProofreadingProvider {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly endpoint = LANGUAGE_TOOL_ENDPOINT,
  ) {}

  async check(text: string): Promise<ProofreadingResult> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      PROOFREADING_TIMEOUT_MS,
    );
    const body = new URLSearchParams({
      text,
      language: "ru-RU",
      enabledOnly: "false",
    });

    try {
      let response: Response;
      try {
        response = await this.fetcher(this.endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
          signal: controller.signal,
        });
      } catch {
        if (controller.signal.aborted) {
          throw new Error("Proofreading service request timed out");
        }

        throw new Error("Unable to reach proofreading service");
      }

      if (!response.ok) {
        throw new Error(
          `Proofreading service returned HTTP ${response.status}`,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        if (controller.signal.aborted) {
          throw new Error("Proofreading service request timed out");
        }

        throw new Error("Proofreading service returned invalid JSON");
      }

      const issues = mergeRussianContextIssues(
        text,
        parseLanguageToolResponse(payload),
      );
      return {
        text,
        correctedText: applyCorrections(text, issues),
        issues,
        language: "ru-RU",
        provider: "languagetool",
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
