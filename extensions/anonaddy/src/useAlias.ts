import { useCachedPromise } from "@raycast/utils";

import { alias } from "./api";

function useAlias(id: string) {
  return useCachedPromise(() => alias.get(id), [], { keepPreviousData: true });
}

export default useAlias;
