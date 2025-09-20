import { Server, VMSummary, Vm } from "./types";
import { LocalStorage } from "@raycast/api";
import { vCenter } from "./vCenter";

/**
 * Get Saved Server from LocalStorage
 * @returns {Promise<Map<string, vCenter[] | undefined>>} Return Saved Server if present otherwise undefined value.
 */
export async function GetServer(): Promise<Map<string, vCenter> | undefined> {
  const json = await LocalStorage.getItem("server");
  if (json) {
    const o: Map<string, vCenter> = new Map();
    const s: Server[] = JSON.parse(json as string);
    s.forEach((d) => {
      o.set(d.name, new vCenter(d.server, d.username, d.password));
    });
    return o;
  } else {
    return undefined;
  }
}

/**
 * Get Saved Server from LocalStorage
 * @returns {Promise<Server[] | undefined>} Return Saved Server if present otherwise undefined value.
 */
export async function GetServerLocalStorage(): Promise<Server[] | undefined> {
  const json = await LocalStorage.getItem("server");
  if (json) {
    return JSON.parse(json as string) as Server[];
  } else {
    return undefined;
  }
}

/**
 * Get Saved Selected Server from LocalStorage
 * @returns {Promise<string | undefined>} Return Selected Server if present otherwise undefined value.
 */
export async function GetSelectedServer(): Promise<string | undefined> {
  const json = await LocalStorage.getItem("server_selected");
  if (json) {
    return json as string;
  } else {
    return undefined;
  }
}

/**
 *  Merge VM data between cache and API state.
 * @param {string} s - Server Name.
 * @param {Vm[]} c - Cache VM Data.
 * @param {VMSummary[]} a - API VM Data.
 * @returns {Vm[]} Return Merged VM Data.
 */
export function CacheMergeVMs(s: string, c: Vm[] | undefined, a: VMSummary[]): Vm[] {
  const o = a.map((a) => {
    if (c) {
      const cf = c.filter((c) => c.summary.vm === a.vm);
      if (cf.length === 1)
        return {
          ...cf[0],
          summary: a,
          server: s,
        } as Vm;
    }
    return { server: s, summary: a } as Vm;
  });
  return o;
}
