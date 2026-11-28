import {
  type AnalyzeConfig,
  analyze,
  type DetectorEntity,
} from "../detector/client";
import type { EntityType, SemanticSkipReason, Span } from "./types";
import { isCardNumber } from "./validators/card";
import { isIbanValid } from "./validators/iban";
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

const VALIDATORS: Partial<
  Readonly<Record<EntityType, (value: string) => boolean>>
> = {
  CARD: isCardNumber,
  IBAN: isIbanValid,
  IP: (value) => !isNonIdentifyingIp(value),
};

function toSpan(entity: DetectorEntity, text: string): Span | null {
  const type = LABEL_TO_TYPE[entity.entity_type];
  if (type === undefined) return null;
  if (
    entity.start < 0 ||
    entity.end > text.length ||
    entity.start >= entity.end
  )
    return null;

  // The detector's structured pass is checksum-only, so it reports a Luhn-valid
  // timestamp as a card. Its spans go through the same validators as the
  // deterministic layer, or enabling the model would undo identifier
  // preservation.
  const accepts = VALIDATORS[type];
  if (accepts !== undefined && !accepts(text.slice(entity.start, entity.end)))
    return null;

  return { type, start: entity.start, end: entity.end, layer: "semantic" };
}

/** Exported so the mapping can be tested without reaching the detector. */
export function entitiesToSpans(
  entities: readonly DetectorEntity[],
  text: string,
): Span[] {
  return entities
    .map((entity) => toSpan(entity, text))
    .filter((span): span is Span => span !== null);
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

  return { ok: true, spans: entitiesToSpans(outcome.entities, text) };
}
