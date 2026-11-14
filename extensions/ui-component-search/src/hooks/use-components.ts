import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CREATE_ERROR_TOAST_OPTIONS } from "../constants";
import { libraries } from "../providers";
import { LibraryId, UIComponent } from "../types";

/** A library whose fetch rejected outright (no live data and no usable fallback). */
export interface FailedLibrary {
  id: LibraryId;
  name: string;
  message: string;
}

/**
 * A library that loaded, but from its bundled static fallback rather than a
 * live fetch — its scraper is likely broken and needs attention.
 */
export interface FallbackLibrary {
  id: LibraryId;
  name: string;
}

interface FetchResult {
  components: UIComponent[];
  failedLibraries: FailedLibrary[];
  fallbackLibraries: FallbackLibrary[];
}

interface UseComponentsResult {
  isLoading: boolean;
  components: UIComponent[];
  failedLibraries: FailedLibrary[];
  fallbackLibraries: FallbackLibrary[];
}

/**
 * Fetch components from all libraries in parallel.
 *
 * Each library is fetched independently and fails soft: a failure in one
 * library never prevents the others from loading. Two degraded states are
 * surfaced to the UI instead of being silently swallowed:
 *
 * - `failedLibraries`:   the fetch rejected and there is no data at all.
 * - `fallbackLibraries`: the live fetch failed (network error, non-OK
 *                        response, or unparseable markup) but the provider's
 *                        bundled static list was used, so a broken scraper
 *                        stays visible.
 */
async function fetchAllComponents(): Promise<FetchResult> {
  const results = await Promise.allSettled(libraries.map((lib) => lib.fetchComponents()));

  const components: UIComponent[] = [];
  const failedLibraries: FailedLibrary[] = [];
  const fallbackLibraries: FallbackLibrary[] = [];

  results.forEach((result, index) => {
    const lib = libraries[index];
    if (result.status === "fulfilled") {
      components.push(...result.value.components);
      if (result.value.source === "fallback") {
        fallbackLibraries.push({ id: lib.id, name: lib.name });
      }
    } else {
      failedLibraries.push({
        id: lib.id,
        name: lib.name,
        message: result.reason?.message || "Unknown error",
      });
    }
  });

  // Warn when some (but not all) libraries failed. A full failure is
  // surfaced through the hook's onError handler instead.
  if (failedLibraries.length > 0 && failedLibraries.length < libraries.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${failedLibraries.length} librar${failedLibraries.length === 1 ? "y" : "ies"} failed to load`,
      message: failedLibraries.map((f) => f.name).join(", "),
    });
  } else if (fallbackLibraries.length > 0) {
    // No hard failures, but some libraries are serving stale fallback data.
    await showToast({
      style: Toast.Style.Failure,
      title: `${fallbackLibraries.length} librar${fallbackLibraries.length === 1 ? "y is" : "ies are"} using fallback data`,
      message: fallbackLibraries.map((f) => f.name).join(", "),
    });
  }

  if (failedLibraries.length === libraries.length) {
    throw new Error("Failed to fetch components from all libraries");
  }

  return { components, failedLibraries, fallbackLibraries };
}

/**
 * Hook that fetches components from all libraries.
 * Optionally filter by a specific library.
 */
export function useComponents(filterLibrary?: LibraryId): UseComponentsResult {
  const { isLoading, data } = usePromise(fetchAllComponents, [], {
    onError: async (e) => {
      await showToast(CREATE_ERROR_TOAST_OPTIONS(e));
    },
  });

  const components = data?.components ?? [];
  const failedLibraries = data?.failedLibraries ?? [];
  const fallbackLibraries = data?.fallbackLibraries ?? [];
  const filtered = filterLibrary ? components.filter((c) => c.library === filterLibrary) : components;

  return { isLoading, components: filtered, failedLibraries, fallbackLibraries };
}
