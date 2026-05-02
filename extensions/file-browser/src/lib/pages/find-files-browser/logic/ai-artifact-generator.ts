/**
 * @module ai-artifact-generator
 *
 * Generates a {@link FindFilesSearchArtifact} from a natural-language query
 * by loading the external prompt asset, calling Raycast AI, parsing the JSON
 * response, validating the predicate, and deriving a TS-based interpretation.
 *
 * This module is the single entry point for AI artifact generation.
 * Errors (missing prompt, AI failure, malformed output, invalid predicate)
 * are returned as failures — there is NO fallback search.
 */

import { AI } from "@raycast/api";
import { homedir } from "os";
import { loadFindFilesPrompt } from "./prompt-loader";
import { validatePredicate, parsePredicateInterpretation } from "./predicate-validator";
import { validateScopePath } from "./scope-path";
import { normalizeFindFilesScopeMode, type FindFilesSearchArtifact } from "./types";

// ── Error types ──

/**
 * Error thrown when artifact generation fails at any stage.
 * Callers should display the message and offer edit/regenerate actions.
 */
export class ArtifactGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtifactGenerationError";
  }
}

// ── Result types ──

export interface ArtifactGenerationResult {
  success: true;
  artifact: FindFilesSearchArtifact;
}

export interface ArtifactGenerationFailure {
  success: false;
  error: string;
}

export type ArtifactGenerationOutcome = ArtifactGenerationResult | ArtifactGenerationFailure;

// ── JSON extraction ──

/**
 * Extract the first JSON object from a potentially markdown-wrapped response.
 * Handles ```json ... ``` fences and plain `{...}` blocks.
 */
function extractJsonObject(text: string): string {
  const trimmed = text.trim();

  // Already a bare JSON object
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  // Extract from markdown code fence
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Fallback: find first { ... } pair
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

// ── Public API ──

/**
 * Generate a search artifact from a natural-language query.
 *
 * Pipeline:
 *  1. Load prompt asset via {@link loadFindFilesPrompt} (throws PromptAssetError if missing)
 *  2. Append user query to prompt template
 *  3. Call Raycast `AI.ask()` with the full prompt
 *  4. Parse JSON response into `{predicate, scopePath, scopeMode, notes}`
 *  5. Validate predicate via {@link validatePredicate}
 *  6. Derive interpretation via {@link parsePredicateInterpretation} (TS-based, NOT AI notes)
 *  7. Return artifact with timestamps
 *
 * @param naturalQuery - The user's natural-language search query.
 * @returns Success with artifact, or failure with error message.
 * @throws {PromptAssetError} If the prompt asset file is missing or empty.
 */
export async function generateSearchArtifact(naturalQuery: string): Promise<ArtifactGenerationOutcome> {
  // 1. Load prompt asset (may throw PromptAssetError for missing/empty)
  const promptTemplate = loadFindFilesPrompt();

  // 2. Replace {{HOME_DIR}} placeholder with the actual home directory
  const resolvedPrompt = promptTemplate.replace(/\{\{HOME_DIR\}\}/g, homedir());

  // 3. Build full prompt by appending the user's query
  const fullPrompt = `${resolvedPrompt}\n\n## User Query\n\n${naturalQuery}`;

  // 3. Call Raycast AI
  let aiResponse: string;
  try {
  // 3. Build full prompt by appending the user's query
  const fullPrompt = `${resolvedPrompt}\n\n## User Query\n\n${naturalQuery}`;

  // 4. Call Raycast AI
    };
  }

  // 4. Parse JSON from AI response
  let parsed: { predicate?: unknown; scopePath?: unknown; scopeMode?: unknown; notes?: unknown };
  try {
    const jsonStr = extractJsonObject(aiResponse);
    parsed = JSON.parse(jsonStr);
  } catch {
    return {
      success: false,
      error: "Failed to parse AI response as JSON",
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      success: false,
      error: "AI response is not a JSON object",
    };
  }

  // 5. Validate required fields
  if (typeof parsed.predicate !== "string" || !parsed.predicate.trim()) {
    return {
      success: false,
      error: "AI response missing required 'predicate' field",
    };
  }

  const predicate = parsed.predicate.trim();
  const rawScopePath = typeof parsed.scopePath === "string" ? parsed.scopePath.trim() : "";
  const scopeMode = normalizeFindFilesScopeMode(parsed.scopeMode);

  // 6. Normalize and validate scopePath
  const scopeValidation = validateScopePath(rawScopePath);
  if (!scopeValidation.valid) {
    return {
      success: false,
      error: scopeValidation.error,
    };
  }
  const scopePath = scopeValidation.normalized;

  // 7. Validate predicate against safe subset
  const validation = validatePredicate(predicate);
  if (!validation.valid) {
    return {
      success: false,
      error: `AI generated invalid predicate: ${validation.error}`,
    };
  }

  // 8. Derive interpretation from TypeScript (NOT from AI notes)
  const interpretation = parsePredicateInterpretation(predicate, scopePath);

  // 9. Build artifact
  const now = Date.now();
  const artifact: FindFilesSearchArtifact = {
    naturalQuery,
    predicate,
    scopePath,
    scopeMode,
    interpretation,
    createdAt: now,
    updatedAt: now,
  };

  return { success: true, artifact };
}
