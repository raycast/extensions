import { createHash } from "crypto";
import type * as TypesZabbix from "@api/zabbix/types";
import { LocalStorage } from "@raycast/api";

export const LocalStorageKeyZabbixServer = "zabbix_server";

/**
 * Generic Function generiting unique hash for Problems LocalStorage Key.
 *
 * Hash is calculated on cache, server and params value.
 *
 * @param localstorage - Cache Id.
 * @param server - Zabbix Server Name.
 * @param params - Zabbix API POST Trigger.
 */
function localstorageKeyProblems(
  localstorage: string,
  server: string,
  params?: TypesZabbix.ZabbixParamsTriggerGet,
): string {
  /* Create Hash */
  const json = {
    localstorage: localstorage,
    server: server,
    params: params,
  };
  const hash = createHash("sha256").update(JSON.stringify(json)).digest("hex");

  /* Return Cache Key */
  return hash;
}

/* LocalStorage Key where min_severity is stored */
export function KeyProblemsMinSeverity(server: string): string {
  return localstorageKeyProblems("problems_min_severity", server);
}

/* LocalStorage Key where acknowledged is stored */
export function KeyProblemsShowAck(server: string): string {
  return localstorageKeyProblems("problems_acknowledged", server);
}

/* Clear LocalStorage for a specific server */
export async function ClearLocalStorage(server: string): Promise<void> {
  const keys = [KeyProblemsMinSeverity(server), KeyProblemsShowAck(server)];
  for (const key of keys) await LocalStorage.removeItem(key);
}
