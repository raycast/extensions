import {
  isRecoverableProviderError,
  OpenAICompatibleConfig,
  translateWithOpenAICompatibleAPI,
  TranslationProviderError,
  TranslationRequest,
} from "./translator-client";
import { ApiProfile } from "../types/profile";

export interface TranslationAttemptFailure {
  profileName: string;
  message: string;
}

export class TranslationFallbackError extends Error {
  readonly attempts: TranslationAttemptFailure[];

  constructor(message: string, attempts: TranslationAttemptFailure[]) {
    super(message);
    this.name = "TranslationFallbackError";
    this.attempts = attempts;
  }
}

export interface TranslationDispatchResult {
  translatedText: string;
  usedProfileName: string;
}

function parseCustomHeaders(headersJson: string): Record<string, string> {
  if (!headersJson.trim()) {
    return {};
  }

  let parsedHeaders: unknown;
  try {
    parsedHeaders = JSON.parse(headersJson);
  } catch {
    throw new TranslationProviderError(
      "Profile custom headers JSON is invalid.",
      "other",
    );
  }

  if (
    !parsedHeaders ||
    Array.isArray(parsedHeaders) ||
    typeof parsedHeaders !== "object"
  ) {
    throw new TranslationProviderError(
      "Profile custom headers JSON must be an object.",
      "other",
    );
  }

  return Object.entries(parsedHeaders).reduce<Record<string, string>>(
    (result, [key, value]) => {
      result[key] = String(value);
      return result;
    },
    {},
  );
}

function toOpenAIConfig(profile: ApiProfile): OpenAICompatibleConfig {
  return {
    apiBaseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model: profile.model,
    timeoutMs: profile.timeoutMs,
    enableStreaming: profile.enableStreaming,
    customHeaders: parseCustomHeaders(profile.customHeadersJson),
  };
}

function buildCandidateProfiles(
  profiles: ApiProfile[],
  defaultProfileId: string | null,
): ApiProfile[] {
  const enabledProfiles = profiles.filter((profile) => profile.enabled);
  if (!defaultProfileId) {
    return enabledProfiles;
  }

  const defaultProfile = enabledProfiles.find(
    (profile) => profile.id === defaultProfileId,
  );
  if (!defaultProfile) {
    return enabledProfiles;
  }

  return [
    defaultProfile,
    ...enabledProfiles.filter((profile) => profile.id !== defaultProfileId),
  ];
}

function formatAttempts(attempts: TranslationAttemptFailure[]): string {
  return attempts
    .map((attempt) => `${attempt.profileName}: ${attempt.message}`)
    .join(" | ");
}

export async function dispatchTranslationWithFallback(params: {
  profiles: ApiProfile[];
  defaultProfileId: string | null;
  request: TranslationRequest;
}): Promise<TranslationDispatchResult> {
  const { profiles, defaultProfileId, request } = params;
  const candidateProfiles = buildCandidateProfiles(profiles, defaultProfileId);
  if (!candidateProfiles.length) {
    throw new TranslationFallbackError("No enabled API profiles found.", []);
  }

  const attempts: TranslationAttemptFailure[] = [];
  for (let index = 0; index < candidateProfiles.length; index += 1) {
    const profile = candidateProfiles[index];

    try {
      const translatedText = await translateWithOpenAICompatibleAPI(
        toOpenAIConfig(profile),
        request,
      );
      return { translatedText, usedProfileName: profile.name };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      attempts.push({ profileName: profile.name, message });

      const canFallback = isRecoverableProviderError(error);
      const isLastCandidate = index === candidateProfiles.length - 1;
      if (!canFallback || isLastCandidate) {
        throw new TranslationFallbackError(
          `Translation failed. ${formatAttempts(attempts)}`,
          attempts,
        );
      }
    }
  }

  throw new TranslationFallbackError(
    "Translation failed without attempts.",
    attempts,
  );
}
