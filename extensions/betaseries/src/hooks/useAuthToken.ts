import { useCachedPromise } from "@raycast/utils";
import { clearToken, getToken, saveToken } from "../api/client";

export function useAuthToken() {
  const { data, isLoading, mutate } = useCachedPromise(getToken, [], {
    initialData: "",
  });

  const setToken = async (token: string) => {
    const normalizedToken = token.trim();
    await saveToken(normalizedToken);
    await mutate(Promise.resolve(normalizedToken), {
      optimisticUpdate: () => normalizedToken,
      shouldRevalidateAfter: false,
    });
  };

  const logout = async () => {
    await clearToken();
    await mutate(Promise.resolve(""), {
      optimisticUpdate: () => "",
      shouldRevalidateAfter: false,
    });
  };

  return {
    token: data || "",
    isLoading,
    setToken,
    logout,
  };
}
