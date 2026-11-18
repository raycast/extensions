import { usePromise } from "@raycast/utils";
import { checkApfel } from "../api/apfel";

export function useApfelCheck(checkForFileSystemPermission?: boolean) {
  return usePromise(checkApfel, [checkForFileSystemPermission]);
}
