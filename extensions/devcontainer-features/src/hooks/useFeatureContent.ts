import { useEffect, useState } from "react";
import { getCachedFeatureContent, setCachedFeatureContent } from "../api/cache";
import { fetchGitHubJson, fetchGitHubText } from "../api/github";
import type { Feature, FeatureContent, ScriptFile } from "../types";

interface UseFeatureContentResult {
  content: FeatureContent;
  isLoading: boolean;
  error: string | null;
}

interface GitHubContentEntry {
  name: string;
  download_url: string | null;
  type: string;
}

function buildRawUrl(
  sourceInfo: string,
  featureId: string,
  file: string,
): string {
  return `https://raw.githubusercontent.com/${sourceInfo}/main/src/${featureId}/${file}`;
}

function cacheKey(sourceInfo: string, featureId: string): string {
  return `${sourceInfo}/${featureId}`;
}

async function fetchText(
  url: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    return await response.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    return null;
  }
}

async function fetchViaContentsApi(
  sourceInfo: string,
  featureId: string,
  signal?: AbortSignal,
): Promise<FeatureContent | null> {
  const url = `https://api.github.com/repos/${sourceInfo}/contents/src/${featureId}`;

  const entries = await fetchGitHubJson<GitHubContentEntry[]>(url, signal);
  if (!entries || !Array.isArray(entries)) return null;

  const shFiles = entries.filter(
    (e) => e.type === "file" && e.name.endsWith(".sh") && e.download_url,
  );
  const readmeEntry = entries.find(
    (e) =>
      e.type === "file" &&
      e.name.toLowerCase() === "readme.md" &&
      e.download_url,
  );

  const scriptPromises = shFiles.map(
    async (entry): Promise<ScriptFile | null> => {
      const content = await fetchGitHubText(entry.download_url!, signal);
      if (!content) return null;
      return { name: entry.name, content };
    },
  );

  const readmePromise = readmeEntry
    ? fetchGitHubText(readmeEntry.download_url!, signal)
    : Promise.resolve(null);

  const [scripts, readme] = await Promise.all([
    Promise.all(scriptPromises),
    readmePromise,
  ]);

  return {
    readme,
    scripts: scripts.filter((s): s is ScriptFile => s !== null),
  };
}

async function fetchViaRawFallback(
  sourceInfo: string,
  featureId: string,
  signal?: AbortSignal,
): Promise<FeatureContent> {
  const filesToTry = ["install.sh", "configure.sh"];

  const [readme, ...scriptResults] = await Promise.all([
    fetchText(buildRawUrl(sourceInfo, featureId, "README.md"), signal),
    ...filesToTry.map(async (name): Promise<ScriptFile | null> => {
      const content = await fetchText(
        buildRawUrl(sourceInfo, featureId, name),
        signal,
      );
      if (!content) return null;
      return { name, content };
    }),
  ]);

  return {
    readme,
    scripts: scriptResults.filter((s): s is ScriptFile => s !== null),
  };
}

async function loadFeatureContent(
  feature: Feature,
  signal?: AbortSignal,
): Promise<FeatureContent> {
  const sourceInfo = feature.collection.sourceInformation;
  const featureId = feature.id;
  const key = cacheKey(sourceInfo, featureId);

  // Check cache first
  const cached = getCachedFeatureContent(key);
  if (cached) return cached;

  // Try Contents API first, fallback to raw URLs
  const contentsResult = await fetchViaContentsApi(
    sourceInfo,
    featureId,
    signal,
  );
  const result =
    contentsResult ??
    (await fetchViaRawFallback(sourceInfo, featureId, signal));

  // Cache the result
  setCachedFeatureContent(key, result);
  return result;
}

export function useFeatureContent(feature: Feature): UseFeatureContentResult {
  const [content, setContent] = useState<FeatureContent>({
    readme: null,
    scripts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loadFeatureContent(
          feature,
          abortController.signal,
        );
        if (isMounted && !abortController.signal.aborted) {
          setContent(result);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was aborted, ignore
          return;
        }
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : "Failed to load content";
          setError(message);
          console.error("Failed to load feature content:", err);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [feature.id, feature.collection.sourceInformation]);

  return { content, isLoading, error };
}
