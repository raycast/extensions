import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { propagateFirstNames } from "./detection/coreference";
import { detectDeterministic } from "./detection/deterministic";
import { mergeSpans } from "./detection/merge";
import { detectSemantic } from "./detection/semantic";
import type { SemanticSkipReason } from "./detection/types";
import { applyMasking } from "./masking/apply";
import { type RawPreferences, toSettings } from "./preferences";
import { buildSummary } from "./summary";

/** Pasting more than this into a chat is not the use case, and it keeps a
 * pathological clipboard from stalling the command. */
const MAX_INPUT_CHARS = 1_000_000;

export default async function maskAndPaste(): Promise<void> {
  let text: string;
  try {
    text = (await Clipboard.readText()) ?? "";
  } catch {
    await showHUD("Could not read the clipboard");
    return;
  }

  if (text.trim().length === 0) {
    await showHUD("Clipboard is empty");
    return;
  }
  if (text.length > MAX_INPUT_CHARS) {
    await showHUD("Clipboard too large to mask");
    return;
  }

  const settings = toSettings(getPreferenceValues<RawPreferences>());

  let skipped: SemanticSkipReason | undefined;
  const spans = [...detectDeterministic(text)];

  const semantic = await detectSemantic(text, {
    baseUrl: settings.detectorUrl,
    timeoutMs: settings.detectorTimeoutMs,
    authToken: settings.authToken,
    phoneRegions: settings.phoneRegions,
    maskPersons: settings.maskPersons,
    maskLocations: settings.maskLocations,
    maskOrganizations: settings.maskOrganizations,
  });

  if (semantic.ok) spans.push(...semantic.spans);
  else skipped = semantic.reason;

  const merged = mergeSpans(spans);
  const withFirstNames = mergeSpans([
    ...merged,
    ...propagateFirstNames(text, merged),
  ]);
  const { masked, counts } = applyMasking(text, withFirstNames);

  try {
    await Clipboard.paste(masked);
  } catch {
    await showHUD("Could not paste the masked text");
    return;
  }

  await showHUD(buildSummary(counts, skipped));
}
