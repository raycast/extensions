import type { ApiResponse, PveServer, PveVm, PveVmConfig, WithServer } from "@/types";
import { buildHeaders } from "@/utils/headers";
import { parseTags } from "@/utils/tags";

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

async function postVmStatus(vm: WithServer<PveVm>, action: string): Promise<string> {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/status/${action}`;
  const response = await pveFetch<string>(vm.server, url, {
    method: "POST",
  });
  return response.data;
}

export const startVm = (vm: WithServer<PveVm>) => postVmStatus(vm, "start");
export const stopVm = (vm: WithServer<PveVm>) => postVmStatus(vm, "stop");
export const shutdownVm = (vm: WithServer<PveVm>) => postVmStatus(vm, "shutdown");
export const suspendVm = (vm: WithServer<PveVm>) => postVmStatus(vm, "suspend");
export const resetVm = (vm: WithServer<PveVm>) => postVmStatus(vm, "reset");
export const resumeVm = (vm: WithServer<PveVm>) => postVmStatus(vm, "resume");
export const rebootVm = (vm: WithServer<PveVm>) => postVmStatus(vm, "reboot");

/**
 * Applies `edit` to the tags the VM has right now and returns the saved list. We send the config
 * digest along, so Proxmox rejects the save when someone changed the VM since we read it.
 */
export async function editVmTags(vm: WithServer<PveVm>, edit: (current: string[]) => string[]): Promise<string[]> {
  const url = `api2/json/nodes/${vm.node}/${vm.id}/config`;
  const { data: config } = await pveFetch<PveVmConfig>(vm.server, url);
  const tags = edit(parseTags(config.tags));
  const body = new URLSearchParams({ digest: config.digest });
  if (tags.length > 0) {
    body.set("tags", tags.join(";"));
  } else {
    body.set("delete", "tags");
  }
  await pveFetch(vm.server, url, {
    method: "PUT",
    body,
  });
  return tags;
}
