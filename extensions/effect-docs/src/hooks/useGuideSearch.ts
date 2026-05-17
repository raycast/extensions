import { useCachedPromise } from "@raycast/utils";
import type { DocItem } from "../types";
import { fetchGuideIndex } from "../utils/fetch-guides";

export function useGuideSearch(): {
	items: DocItem[];
	isLoading: boolean;
	error?: Error;
} {
	const { data, isLoading, error } = useCachedPromise(fetchGuideIndex, [], {
		failureToastOptions: { title: "Failed to load guides" },
	});

	return { items: data ?? [], isLoading, error };
}
