import { usePromise } from "@raycast/utils";

import * as context from "./context";

function useContext() {
  return usePromise(context.get);
}

export default useContext;
