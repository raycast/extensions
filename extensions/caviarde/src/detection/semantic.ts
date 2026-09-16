import {
  type AnalyzeConfig,
  analyze,
  type DetectorEntity,
} from "../detector/client";
import type { EntityType, SemanticSkipReason, Span } from "./types";
import { isNonIdentifyingIp } from "./validators/ip";

/** Past this the detector costs more than the hotkey is worth, so the layer is
 * skipped whole rather than truncated. */
export const SEMANTIC_MAX_CHARS = 6_000;

const LABEL_TO_TYPE: Readonly<Record<string, EntityType>> = {
  PERSON: "PERSON",
  LOCATION: "LOCATION",
  ORGANIZATION: "ORGANIZATION",
  EMAIL_ADDRESS: "EMAIL",
  PHONE_NUMBER: "PHONE",
  CREDIT_CARD: "CARD",
  IBAN_CODE: "IBAN",
  IP_ADDRESS: "IP",
  VAT_CODE: "VAT",
};

export interface SemanticOptions extends AnalyzeConfig {
  readonly phoneRegions: readonly string[];
  readonly maskPersons: boolean;
  readonly maskLocations: boolean;
  readonly maskOrganizations: boolean;
}

export type SemanticResult =
  | { readonly ok: true; readonly spans: readonly Span[] }
  | { readonly ok: false; readonly reason: SemanticSkipReason };

/** A mistyped label makes the detector return an empty list with no error, so
 * only names it is known to understand are ever sent. */
function requestedLabels(options: SemanticOptions): string[] {
  const labels = Object.keys(LABEL_TO_TYPE).filter((label) => {
    if (label === "PERSON") return options.maskPersons;
    if (label === "LOCATION") return options.maskLocations;
    if (label === "ORGANIZATION") return options.maskOrganizations;
    return true;
  });
  return labels;
}

function toSpan(entity: DetectorEntity, text: string): Span | null {
  const type = LABEL_TO_TYPE[entity.entity_type];
  if (type === undefined) return null;
  if (
    entity.start < 0 ||
    entity.end > text.length ||
    entity.start >= entity.end
  )
    return null;

  // The detector has its own IP pass and reports loopback too.
  const value = text.slice(entity.start, entity.end);
  if (type === "IP" && isNonIdentifyingIp(value)) return null;

  return { type, start: entity.start, end: entity.end, layer: "semantic" };
}

export async function detectSemantic(
  text: string,
  options: SemanticOptions,
): Promise<SemanticResult> {
  if (
    !options.maskPersons &&
    !options.maskLocations &&
    !options.maskOrganizations
  ) {
    return { ok: false, reason: "disabled" };
  }
  if (text.length > SEMANTIC_MAX_CHARS) {
    return { ok: false, reason: "too-large" };
  }

  const outcome = await analyze(
    {
      text,
      entities: requestedLabels(options),
      phoneRegions: options.phoneRegions,
    },
    options,
  );

  if (!outcome.ok) return { ok: false, reason: outcome.reason };

  const spans = outcome.entities
    .map((entity) => toSpan(entity, text))
    .filter((span): span is Span => span !== null);

  return { ok: true, spans };
}
