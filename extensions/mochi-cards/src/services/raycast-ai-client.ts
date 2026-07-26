import { AI, environment } from "@raycast/api";

import type { AiClient } from "../domain/template-engine";

export type RaycastAiErrorKind = "access-denied" | "request-failed" | "aborted";

export class RaycastAiError extends Error {
  readonly kind: RaycastAiErrorKind;

  constructor(kind: RaycastAiErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RaycastAiError";
    this.kind = kind;
  }
}

export class RaycastAiClient implements AiClient {
  async ask(prompt: string, signal?: AbortSignal): Promise<string> {
    if (!environment.canAccess(AI)) {
      throw new RaycastAiError("access-denied", "Raycast AI access is required for this field");
    }

    try {
      return await AI.ask(prompt, { signal });
    } catch (error: unknown) {
      if (signal?.aborted) {
        throw new RaycastAiError("aborted", "AI generation was cancelled", { cause: error });
      }
      throw new RaycastAiError("request-failed", errorMessage(error, "Raycast AI request failed"), { cause: error });
    }
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0 ? error.message : fallback;
}
