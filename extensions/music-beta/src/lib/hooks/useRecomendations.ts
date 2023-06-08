import { useCachedPromise } from "@raycast/utils";

import { api } from "../apple-music";

function getRecommendations() {
	return api.authenticated.me.recommendations();
}

export default function useRecommendations() {
	const { isLoading, data, revalidate } = useCachedPromise(getRecommendations);

	return { data, isLoading, revalidate } as const;
}
