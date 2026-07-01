import { useCachedPromise } from "@raycast/utils";
import { getDatacenterById, formatDatacenterLocation, type Datacenter } from "../modules/rovalra-api";

export interface ServerRegionInfo {
  dataCenterId: number;
  datacenter: Datacenter;
  locationText: string;
}

async function resolveServerRegion(dataCenterId: number): Promise<ServerRegionInfo | null> {
  const datacenter = await getDatacenterById(dataCenterId);
  if (!datacenter) {
    return null;
  }

  return {
    dataCenterId,
    datacenter,
    locationText: formatDatacenterLocation(datacenter),
  };
}

export function useServerRegion(dataCenterId?: number) {
  return useCachedPromise((dataCenterId: number) => resolveServerRegion(dataCenterId), [dataCenterId ?? 0], {
    execute: !!dataCenterId,
  });
}
