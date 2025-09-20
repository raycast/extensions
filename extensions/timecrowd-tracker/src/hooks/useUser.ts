import { getUser } from "@/api";
import { useCachedPromise } from "@raycast/utils";

export const useUser = () => {
  const { isLoading, data, revalidate } = useCachedPromise(getUser);

  return {
    isLoadingUser: isLoading,
    user: data,
    revalidateUser: revalidate,
  };
};
