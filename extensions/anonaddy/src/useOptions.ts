import { useCachedPromise } from "@raycast/utils";

import { domains } from "./api";

function useOptions() {
  return useCachedPromise(() => domains.options(), [], { keepPreviousData: true });
}

export default useOptions;
