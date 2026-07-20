import { getPreferenceValues } from "@raycast/api";
import type { ApiResponse, PveVm } from "@/types";
import { buildHeaders } from "@/utils/headers";

async function pveFetch<T = unknown>(url: string, options?: RequestInit) {
  const preferences = getPreferenceValues<Preferences>();
  const fetchUrl = new URL(url, preferences.serverUrl).toString();
  const fetchOptions = Object.assign({}, options, {
    headers: buildHeaders(),
  });

  const response = await fetch(fetchUrl, fetchOptions);
  return (await response.json()) as ApiResponse<T>;
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
