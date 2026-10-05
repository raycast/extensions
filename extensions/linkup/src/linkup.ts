import { getPreferenceValues } from "@raycast/api";
import {
  LinkupAuthenticationError,
  LinkupBudgetLimitExceededError,
  LinkupClient,
  LinkupInsufficientCreditError,
  LinkupNoResultError,
  LinkupPaymentRequiredError,
  LinkupTooManyRequestsError,
  type TextSearchResult,
} from "linkup-sdk";

const preferences: ExtensionPreferences = getPreferenceValues();
const linkup = new LinkupClient({ apiKey: preferences.apiKey });

export function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function normalizeUrl(input: string) {
  const trimmed = input.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(candidate).toString();
  } catch {
    throw new Error(`"${trimmed}" is not a valid URL.`);
  }
}

export function formatLinkupError(error: unknown) {
  if (error instanceof LinkupAuthenticationError) {
    return "Linkup rejected the API key. Check the API key in the extension preferences.";
  }

  if (
    error instanceof LinkupInsufficientCreditError ||
    error instanceof LinkupPaymentRequiredError ||
    error instanceof LinkupBudgetLimitExceededError
  ) {
    return "Your Linkup account is out of credits. Add credits at https://app.linkup.so.";
  }

  if (error instanceof LinkupTooManyRequestsError) {
    return "Too many requests to Linkup. Wait a moment and try again.";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Something went wrong while talking to Linkup.";
}

export async function searchResults(query: string): Promise<TextSearchResult[]> {
  try {
    const response = await linkup.search({
      query,
      depth: preferences.depth,
      outputType: "searchResults",
    });

    return response.results.filter((result): result is TextSearchResult => result.type === "text");
  } catch (error) {
    if (error instanceof LinkupNoResultError) {
      return [];
    }
    throw error;
  }
}

export async function sourcedAnswer(query: string) {
  return linkup.search({
    query,
    depth: preferences.depth,
    outputType: "sourcedAnswer",
  });
}

export async function fetchMarkdown(url: string) {
  return linkup.fetch({ url: normalizeUrl(url) });
}
