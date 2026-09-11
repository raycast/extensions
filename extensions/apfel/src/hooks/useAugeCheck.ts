import { usePromise } from "@raycast/utils";
import { checkAuge } from "../api/auge";

export function useAugeCheck(checkForFileSystemPermission?: boolean) {
  return usePromise(checkAuge, [checkForFileSystemPermission]);
}
