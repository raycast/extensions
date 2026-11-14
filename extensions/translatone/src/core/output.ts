import type { ProviderError } from "./errors";
import { PROVIDERS, type ProviderId } from "./providers";

export type PrimaryAction = "paste" | "copy";

export type OutputAction = PrimaryAction | "replace";

export interface OutputOrigin {
  readonly providerId: ProviderId;
  readonly skipped: readonly ProviderError[];
}

const CONFIRMATIONS: Readonly<Record<OutputAction, string>> = {
  paste: "Pasted",
  copy: "Copied",
  replace: "Replaced selection",
};

export function resolvePrimaryAction(value: string | undefined): PrimaryAction {
  return value === "copy" ? "copy" : "paste";
}

export function outputActions(primary: PrimaryAction): readonly PrimaryAction[] {
  return primary === "paste" ? ["paste", "copy"] : ["copy", "paste"];
}

export function confirmationMessage(action: OutputAction, origin: OutputOrigin): string {
  const parts = [CONFIRMATIONS[action], `via ${PROVIDERS[origin.providerId].name}`];
  const [firstSkipped] = origin.skipped;
  if (firstSkipped) {
    parts.push(firstSkipped.summary);
  }
  return parts.join(" · ");
}
