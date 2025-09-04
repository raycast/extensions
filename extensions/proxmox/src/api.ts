import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";

export const enum PveVmStatus {
  running = "running",
  stopped = "stopped",
  paused = "paused",
}

export const enum PveVmTypes {
  qemu = "qemu",
  lxc = "lxc",
}

export interface PveVm {
  id: string;
  type: PveVmTypes;
  name: string;

  cpu: number;
  disk: number;
  mem: number;
  maxcpu: number;
  maxdisk: number;
  maxmem: number;

  diskread: number;
  diskwrite: number;
  netin: number;
  netout: number;

  node: string;
  status: PveVmStatus;
  uptime: number;
  vmid: number;
}

interface ApiResponse<T> {
  data: T;
}

type FetchOptions<T> = Parameters<typeof useFetch<T>>[1];

function buildHeaders() {
  const preferences = getPreferenceValues<Preferences>();
  return {
    Authorization: `PVEAPIToken=${preferences.tokenId}=${preferences.tokenSecret}`,
  };
}
async function pveFetch<T = unknown>(url: string, options?: RequestInit) {
  const preferences = getPreferenceValues<Preferences>();
  const fetchUrl = new URL(url, preferences.serverUrl).toString();
  const fetchOptions = Object.assign({}, options, {
    headers: buildHeaders(),
  });

  const response = await fetch(fetchUrl, fetchOptions);
  return (await response.json()) as ApiResponse<T>;
}

function usePveFetch<T>(url: string, options?: RequestInit) {
  const preferences = getPreferenceValues<Preferences>();
  const fetchUrl = new URL(url, preferences.serverUrl).toString();
  const fetchOptions: FetchOptions<T> = {
    ...options,
    headers: buildHeaders(),
    mapResult(result) {
      return { data: (result as ApiResponse<T>).data };
    },
  };

  const result = useFetch<T>(fetchUrl, fetchOptions);

  useEffect(() => {
    const handle = setInterval(() => {
      result.revalidate();
    }, 1000);

    return () => clearInterval(handle);
  }, [result.revalidate]);

  return result;
}

export function useVmList() {
  const url = "api2/json/cluster/resources";
  const search = new URLSearchParams({
    type: "vm",
  });

  return usePveFetch<PveVm[]>(`${url}?${search.toString()}`);
}

export async function startVm(vm: PveVm) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/start`;
  await pveFetch(url, {
    method: "POST",
  });
}

export async function stopVm(vm: PveVm) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/stop`;
  await pveFetch(url, {
    method: "POST",
  });
}

export async function shutdownVm(vm: PveVm) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/shutdown`;
  await pveFetch(url, {
    method: "POST",
  });
}

export async function suspendVm(vm: PveVm) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/suspend`;
  await pveFetch(url, {
    method: "POST",
  });
}

export async function resetVm(vm: PveVm) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/reset`;
  await pveFetch(url, {
    method: "POST",
  });
}

export async function resumeVm(vm: PveVm) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/resume`;
  await pveFetch(url, {
    method: "POST",
  });
}

export async function rebootVm(vm: PveVm) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/reboot`;
  await pveFetch(url, {
    method: "POST",
  });
}
