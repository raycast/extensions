import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CREATE_ERROR_TOAST_OPTIONS } from "../constants";
import { libraries } from "../providers";
import { LibraryId, UIComponent } from "../types";

interface UseComponentsResult {
  isLoading: boolean;
  components: UIComponent[];
}

/**
 * Fetch components from all libraries in parallel.
 * Returns a flat array of all components across all libraries.
 */
async function fetchAllComponents(): Promise<UIComponent[]> {
  const results = await Promise.allSettled(libraries.map((lib) => lib.fetchComponents()));

  const allComponents: UIComponent[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      allComponents.push(...result.value);
    } else {
      errors.push(`${libraries[index].name}: ${result.reason?.message || "Unknown error"}`);
    }
  });

  // Show a warning toast if some libraries failed but not all
  if (errors.length > 0 && errors.length < libraries.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Some libraries failed to load",
      message: errors.join("; "),
    });
  }

  // If ALL libraries failed, throw so the hook's onError fires
  if (errors.length === libraries.length) {
    throw new Error("Failed to fetch components from all libraries");
  }

  return allComponents;
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

  const components = data ?? [];
  const filtered = filterLibrary ? components.filter((c) => c.library === filterLibrary) : components;

  return { isLoading, components: filtered };
}
