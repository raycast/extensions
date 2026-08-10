import type { ApiResponse, PveServer, PveVm, WithServer } from "@/types";
import { buildHeaders } from "@/utils/headers";

export async function pveFetch<T = unknown>(server: PveServer, url: string, options?: RequestInit) {
  const fetchUrl = new URL(url, server.url).toString();
  const fetchOptions = Object.assign({}, options, {
    headers: buildHeaders(server),
  });

  const response = await fetch(fetchUrl, fetchOptions);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as ApiResponse<T>;
}

export async function startVm(vm: WithServer<PveVm>) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/start`;
  await pveFetch(vm.server, url, {
    method: "POST",
  });
}

export async function stopVm(vm: WithServer<PveVm>) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/stop`;
  await pveFetch(vm.server, url, {
    method: "POST",
  });
}

export async function shutdownVm(vm: WithServer<PveVm>) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/shutdown`;
  await pveFetch(vm.server, url, {
    method: "POST",
  });
}

export async function suspendVm(vm: WithServer<PveVm>) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/suspend`;
  await pveFetch(vm.server, url, {
    method: "POST",
  });
}

export async function resetVm(vm: WithServer<PveVm>) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/reset`;
  await pveFetch(vm.server, url, {
    method: "POST",
  });
}

export async function resumeVm(vm: WithServer<PveVm>) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/resume`;
  await pveFetch(vm.server, url, {
    method: "POST",
  });
}

export async function rebootVm(vm: WithServer<PveVm>) {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/reboot`;
  await pveFetch(vm.server, url, {
    method: "POST",
  });
}
