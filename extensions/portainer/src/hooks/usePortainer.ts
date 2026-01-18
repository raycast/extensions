import { useCachedPromise } from "@raycast/utils";
import { portainerApi } from "../api/portainer";

export function useEndpoints() {
  return useCachedPromise(
    async () => {
      return portainerApi.getEndpoints();
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

export function useContainers(endpointId?: string) {
  return useCachedPromise(
    async (id: string | undefined) => {
      return portainerApi.getContainers(id);
    },
    [endpointId],
    {
      keepPreviousData: true,
    },
  );
}

export function useStacks() {
  return useCachedPromise(
    async () => {
      return portainerApi.getStacks();
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

export function useImages(endpointId?: string) {
  return useCachedPromise(
    async (id: string | undefined) => {
      return portainerApi.getImages(id);
    },
    [endpointId],
    {
      keepPreviousData: true,
    },
  );
}

export function useVolumes(endpointId?: string) {
  return useCachedPromise(
    async (id: string | undefined) => {
      return portainerApi.getVolumes(id);
    },
    [endpointId],
    {
      keepPreviousData: true,
    },
  );
}

export function useNetworks(endpointId?: string) {
  return useCachedPromise(
    async (id: string | undefined) => {
      return portainerApi.getNetworks(id);
    },
    [endpointId],
    {
      keepPreviousData: true,
    },
  );
}

export function useContainerLogs(containerId: string, endpointId?: string) {
  return useCachedPromise(
    async (cId: string, eId: string | undefined) => {
      return portainerApi.getContainerLogs(cId, eId);
    },
    [containerId, endpointId],
    {
      keepPreviousData: true,
    },
  );
}

export { portainerApi };
