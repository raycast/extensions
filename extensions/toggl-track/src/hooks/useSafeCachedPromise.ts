import { showToast, Toast } from "@raycast/api";
import { useCachedPromise, CachedPromiseOptions } from "@raycast/utils";
import { FunctionReturningPromise } from "@raycast/utils/dist/types";

import { useExtensionContext } from "@/context/ExtensionContext";

export const useSafeCachedPromise: typeof useCachedPromise = <T extends FunctionReturningPromise, U = undefined>(
  fn: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: any,
  options?: CachedPromiseOptions<T, U>,
) => {
  const handleError = useHandleError(useExtensionContext());
  return useCachedPromise(fn, args, {
    ...options,
    onError: handleError,
  });
};

const useHandleError =
  ({ setTokenValidity }: ReturnType<typeof useExtensionContext>) =>
  async (error: Error) => {
    if (error.message.endsWith("Incorrect username and/or password")) {
      setTokenValidity(false);
    } else {
      const toast = await showToast(Toast.Style.Failure, "Something went wrong!");
      toast.message = error.message;
      console.error(error);
    }
  };
