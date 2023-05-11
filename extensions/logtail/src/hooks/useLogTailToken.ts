import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { LogTail } from "../lib/logtail";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

export type UseLogTailTokenResult = Omit<UseCachedPromiseReturnType<string, undefined>, "data" | "isLoading"> & {
  token?: string;
  isTokenLoading: boolean;
};
export const useLogTailToken = () => {
  const {
    data: token,
    isLoading: isTokenLoading,
    ...rest
  } = useCachedPromise(() => LocalStorage.getItem<string>(LogTail.TOKEN_CACHE_KEY));

  return {
    ...rest,
    token,
    isTokenLoading,
  };
};
