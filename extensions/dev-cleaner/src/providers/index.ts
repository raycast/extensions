import type { CleanupProvider, ScanContext, ScanResult } from "../types";
import { AiToolsProvider } from "./ai-tools";
import { AppleCachesProvider } from "./apple-caches";
import { NativeToolsProvider } from "./native-tools";
import { ProjectArtifactsProvider } from "./projects";
import { RuntimeCachesProvider } from "./runtime-caches";
import { XcodeProvider } from "./xcode";

export const providers: CleanupProvider[] = [
  new AiToolsProvider(),
  new AppleCachesProvider(),
  new NativeToolsProvider(),
  new RuntimeCachesProvider(),
  new ProjectArtifactsProvider(),
  new XcodeProvider(),
];

function combineResults(results: ScanResult[]): ScanResult {
  const uniqueCandidates = [
    ...new Map(results.flatMap((result) => result.candidates).map((candidate) => [candidate.id, candidate])).values(),
  ];
  const uniqueProtectedItems = [
    ...new Map(results.flatMap((result) => result.protectedItems ?? []).map((item) => [item.id, item])).values(),
  ];
  return {
    candidates: uniqueCandidates.sort(
      (left, right) => left.section.localeCompare(right.section) || (right.bytes ?? -1) - (left.bytes ?? -1),
    ),
    issues: results.flatMap((result) => result.issues),
    protectedItems: uniqueProtectedItems,
  };
}

export async function scanAll(
  context: ScanContext,
  onProgress?: (result: ScanResult, completedProviders: number, totalProviders: number) => void,
): Promise<ScanResult> {
  const results: ScanResult[] = [];
  let completed = 0;
  await Promise.all(
    providers.map(async (provider) => {
      try {
        const result = await provider.scan(context);
        results.push(result);
      } catch (error) {
        context.signal?.throwIfAborted();
        results.push({ candidates: [], issues: [{ providerId: provider.id, message: (error as Error).message }] });
      }
      completed += 1;
      onProgress?.(combineResults(results), completed, providers.length);
    }),
  );
  context.signal?.throwIfAborted();
  return combineResults(results);
}
