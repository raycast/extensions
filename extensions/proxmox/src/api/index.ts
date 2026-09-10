import type { ApiResponse, PveServer, PveVm, WithServer } from "@/types";
import { buildHeaders } from "@/utils/headers";

/** Upper bound for a single request, a server that stops answering must not stay pending forever */
const REQUEST_TIMEOUT_MS = 10_000;

export async function pveFetch<T = unknown>(server: PveServer, url: string, options?: RequestInit) {
  const fetchUrl = new URL(url, server.url).toString();

  // Bound each request in time, so a server that accepts the connection but
  // never answers cannot keep its caller pending forever. This has to happen
  // per request rather than once per render: a signal created during a render
  // is still the one a later manual refresh reuses, and by then its deadline
  // has expired, which would fail the request before it is even sent.
  //
  // The deadline rejects with a `TimeoutError` rather than an `AbortError`, so
  // callers can tell a hung server apart from a request they cancelled
  // themselves and report it instead of silently discarding it.
  const deadline = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const fetchOptions: RequestInit = {
    ...options,
    headers: buildHeaders(server),
    signal: options?.signal ? AbortSignal.any([options.signal, deadline]) : deadline,
  };

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
