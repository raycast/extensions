import type { OBSRequestTypes } from "obs-websocket-js";
import { useCachedPromise } from "@raycast/utils";
import { getObs } from "@/lib/obs";
import useIsInstalled from "@/hooks/use-is-installed";

const useOBSRequest = <Type extends keyof OBSRequestTypes>(
  requestType: Type,
  execute = true,
  requestData?: OBSRequestTypes[Type],
) => {
  const isAppInstalled = useIsInstalled();
  return useCachedPromise(
    async (request: Type, rData?: OBSRequestTypes[Type]) => {
      const obs = await getObs();
      return obs.call(request, rData);
    },
    [requestType, requestData],
    {
      execute: isAppInstalled && execute,
    },
  );
};

export default useOBSRequest;
