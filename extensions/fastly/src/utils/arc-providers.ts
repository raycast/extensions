import { ArcProvider } from "../types";

// ARC records may store a provider as its catalog id ("anthropic") or its
// display name ("Anthropic"), depending on where they were created, so every
// lookup matches both, case-insensitively.
export function resolveProvider(providers: ArcProvider[], raw: string): ArcProvider | undefined {
  const needle = raw.toLowerCase();
  return providers.find(
    (provider) => provider.id.toLowerCase() === needle || provider.display_name.toLowerCase() === needle,
  );
}

export function providerDisplayName(providers: ArcProvider[], raw: string): string {
  return resolveProvider(providers, raw)?.display_name || raw;
}

export function isSameProvider(providers: ArcProvider[], a: string, b: string): boolean {
  if (a.toLowerCase() === b.toLowerCase()) {
    return true;
  }
  const resolvedA = resolveProvider(providers, a);
  return resolvedA !== undefined && resolvedA === resolveProvider(providers, b);
}
