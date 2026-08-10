import { useCachedPromise } from "@raycast/utils";

import { alias } from "./api";

function useAliases() {
  return useCachedPromise(() => alias.get(), [], { keepPreviousData: true });
}

export default useAliases;
