import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CREATE_ERROR_TOAST_OPTIONS } from "../constants";
import { libraries } from "../providers";
import { LibraryId, UIComponent } from "../types";

/** A library whose fetch failed, along with the reason. */
export interface FailedLibrary {
  id: LibraryId;
  name: string;
  message: string;
}

interface FetchResult {
  components: UIComponent[];
  failedLibraries: FailedLibrary[];
}

interface UseComponentsResult {
  isLoading: boolean;
  components: UIComponent[];
  failedLibraries: FailedLibrary[];
}

/**
 * Fetch components from all libraries in parallel.
 *
 * Each library is fetched independently and fails soft: a failure in one
 * library never prevents the others from loading. Failed libraries are
 * collected and returned so the UI can mark them visibly instead of
 * silently omitting them.
 */
async function fetchAllComponents(): Promise<FetchResult> {
  const results = await Promise.allSettled(libraries.map((lib) => lib.fetchComponents()));

  const components: UIComponent[] = [];
  const failedLibraries: FailedLibrary[] = [];

  results.forEach((result, index) => {
    const lib = libraries[index];
    if (result.status === "fulfilled") {
      components.push(...result.value);
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
  }

  if (failedLibraries.length === libraries.length) {
    throw new Error("Failed to fetch components from all libraries");
  }

  return { components, failedLibraries };
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
  const filtered = filterLibrary ? components.filter((c) => c.library === filterLibrary) : components;

  return { isLoading, components: filtered, failedLibraries };
}
