import { createHash } from "node:crypto";
import type { ProviderConfig } from "./providers";
import { describeTarget, type TranslationTarget } from "./target";
import type { ToneId } from "./tones";
import type { TranslationResult } from "./translate";

export interface DetailContent {
  readonly translation: string;
  readonly original: string;
  readonly sourceLabel: string | undefined;
  readonly failed: boolean;
}

export interface EmptyViewContent {
  readonly needsSetup: boolean;
  readonly title: string;
  readonly description: string;
}

const START_HINT =
  "Select text in any app before opening TranslaTone, or type here. Pick a tone with ↑↓ and press ↵ to paste.";

const SETUP_VIEW: EmptyViewContent = {
  needsSetup: true,
  title: "Add a provider to start",
  description:
    "Open Manage Providers to add your first provider or choose an enabled primary provider. Press ↵ to manage providers.",
};

export function formatDetailMarkdown({ translation, original, sourceLabel, failed }: DetailContent): string {
  const heading = sourceLabel ? `**Original** · ${sourceLabel}` : "**Original**";
  const quoted = original
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return [translation || placeholder(failed), "---", heading, quoted].join("\n\n");
}

export function formatClipboardPreview(text: string): string {
  const fence = "`".repeat(Math.max(3, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length + 1)));
  return [
    "**Clipboard preview**",
    "Press ↵ to translate. Nothing is sent from this preview until you submit it.",
    "**Original · From clipboard**",
    `${fence}\n${text}\n${fence}`,
  ].join("\n\n");
}

export function emptyViewContent(providerCount: number, usageSummary: string | undefined): EmptyViewContent {
  if (providerCount === 0) {
    return SETUP_VIEW;
  }
  return {
    needsSetup: false,
    title: "Translate anything with the right tone",
    description: usageSummary ? `${START_HINT}\n\n${usageSummary}` : START_HINT,
  };
}

export function translationKey(
  text: string,
  target: TranslationTarget,
  tone: ToneId,
  providers: readonly ProviderConfig[],
): string {
  const configuration = providers.map(({ id, baseUrl, model, apiKey }) => [id, baseUrl, model, apiKey]);
  const fingerprint = createHash("sha256").update(JSON.stringify(configuration)).digest("hex");
  return JSON.stringify([text.trim(), describeTarget(target), tone, fingerprint]);
}

export function currentTranslation(
  result: TranslationResult | undefined,
  requestedKey: string,
  currentKey: string,
): TranslationResult | undefined {
  return requestedKey === currentKey ? result : undefined;
}

function placeholder(failed: boolean): string {
  return failed ? "**Couldn't translate this text.** Press ⌘R to retry, or ⌘K for more actions." : "_Translating…_";
}
