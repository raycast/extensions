import { useCachedPromise } from "@raycast/utils";
import type { ApiItem } from "../types";
import { fetchApiIndex } from "../utils/fetch-api";

export function useApiSearch(): {
	items: ApiItem[];
	isLoading: boolean;
	error?: Error;
} {
	const { data, isLoading, error } = useCachedPromise(fetchApiIndex, [], {
		failureToastOptions: { title: "Failed to load API reference" },
	});

	return { items: Array.isArray(data) ? data : [], isLoading, error };
}
