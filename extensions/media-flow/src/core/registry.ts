import type { SourceProvider } from "./types";

const providers: SourceProvider[] = [];

export function registerProvider(p: SourceProvider): void {
  if (providers.some((x) => x.id === p.id)) return;
  providers.push(p);
}

export function getProviders(): SourceProvider[] {
  return [...providers];
}

export function findProviderForBundle(bundleId: string): SourceProvider | undefined {
  return providers.find((p) => p.bundleIds.includes(bundleId));
}

/** Test helper. */
export function clearProviders(): void {
  providers.length = 0;
}
