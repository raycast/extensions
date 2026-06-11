import { getFrontmostApplication } from "@raycast/api";
import { BloomProvider } from "./bloom";
import { FinderProvider } from "./finder";
import type { FileManagerProvider } from "./types";

export const PROVIDERS: readonly FileManagerProvider[] = [new FinderProvider(), new BloomProvider()];

const DEFAULT_PROVIDER = PROVIDERS[0];

export async function resolveActiveProvider(): Promise<FileManagerProvider> {
  try {
    const front = await getFrontmostApplication();
    const match = PROVIDERS.find((p) => p.bundleId === front.bundleId);
    if (match) return match;
  } catch {
    // fall through to default provider
  }
  return DEFAULT_PROVIDER;
}
