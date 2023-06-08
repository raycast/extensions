import { usePromise, useCachedPromise } from "@raycast/utils";

import { getToken } from "./api/token";

export function useMusicToken() {
	return usePromise(getToken);
}

export function useUserToken() {
	const { data, isLoading, error } = useCachedPromise(() => Promise.resolve("token"));

	if ((!data && !isLoading) || !!error) {
		return { error };
	}

	return { data, isLoading };
}
