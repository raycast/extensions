import { getRemainingPercentOrNull } from "../agents/format.ts";
import { httpFetch } from "../agents/http.ts";
import type { ElevenLabsError, ElevenLabsUsage } from "./types.ts";

const ELEVENLABS_SUBSCRIPTION_API = "https://api.elevenlabs.io/v1/user/subscription";
const UNAUTHORIZED_MESSAGE =
  "ElevenLabs rejected this API key. Check that it is valid and has the User → Read permission, then update it in extension settings.";
const FORBIDDEN_MESSAGE =
  "ElevenLabs denied access for this API key. Enable the User → Read permission and check its IP allowlist.";

type ElevenLabsResult = { usage: ElevenLabsUsage | null; error: ElevenLabsError | null };

function parseError(field: string): { usage: null; error: ElevenLabsError } {
  return { usage: null, error: { type: "parse_error", message: `Invalid ElevenLabs subscription response: ${field}` } };
}

function count(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

/** Turn a tier id into a label: `creator` → "Creator", `growing_business` → "Growing Business". */
function formatPlan(tier: unknown): string | null {
  if (typeof tier !== "string") return null;
  const words = tier
    .trim()
    .split(/[_\s-]+/)
    .filter(Boolean);
  if (words.length === 0) return null;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

export function parseElevenLabsSubscription(data: unknown): ElevenLabsResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) return parseError("expected an object");
  const root = data as Record<string, unknown>;

  // ElevenLabs bills in credits but still names the fields after characters.
  const creditsUsed = count(root.character_count);
  if (creditsUsed === undefined) return parseError("character_count");
  const creditLimit = count(root.character_limit);
  if (creditLimit === undefined) return parseError("character_limit");

  let resetsAt: string | null = null;
  if (root.next_character_count_reset_unix !== undefined && root.next_character_count_reset_unix !== null) {
    const resetSeconds = count(root.next_character_count_reset_unix);
    if (resetSeconds === undefined) return parseError("next_character_count_reset_unix");
    resetsAt = new Date(resetSeconds * 1000).toISOString();
  }

  const status = typeof root.status === "string" && root.status.trim() ? root.status.trim() : null;
  const creditsRemaining = Math.max(0, creditLimit - creditsUsed);

  return {
    usage: {
      plan: formatPlan(root.tier),
      status: status && status.toLowerCase() !== "active" ? status : null,
      creditsUsed,
      creditLimit,
      creditsRemaining,
      percentageRemaining: getRemainingPercentOrNull(creditsRemaining, creditLimit),
      resetsAt,
    },
    error: null,
  };
}

export async function fetchElevenLabsUsage(apiKey: string): Promise<ElevenLabsResult> {
  const { data, error } = await httpFetch({
    url: ELEVENLABS_SUBSCRIPTION_API,
    headers: { Accept: "application/json", "xi-api-key": apiKey },
    unauthorizedMessage: UNAUTHORIZED_MESSAGE,
    forbiddenMessage: FORBIDDEN_MESSAGE,
  });
  if (error) return { usage: null, error };
  return parseElevenLabsSubscription(data);
}
