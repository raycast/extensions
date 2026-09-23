import { createHash } from "crypto";
import type * as TypesZabbix from "@api/zabbix/types.ts";

/**
 * Generic Function generiting unique hash for Problems Cache Key.
 *
 * Hash is calculated on cache, server and params value.
 *
 * @param cache - Cache Id.
 * @param server - Zabbix Server Name.
 * @param params - Zabbix API POST Trigger.
 */
function cacheKey(
  cache: string,
  server: string,
  params: TypesZabbix.ZabbixParamsTriggerGet,
): string {
  /* Create Hash */
  const json = {
    cache: cache,
    server: server,
    params: params,
  };
  const hash = createHash("sha256").update(JSON.stringify(json)).digest("hex");

  /* Return Cache Key */
  return hash;
}

/**
 * Get Cache Key where storing Problems Data.
 */
export function Problems(
  server: string,
  params: TypesZabbix.ZabbixParamsTriggerGet,
): string {
  return cacheKey("problems", server, params);
}

/**
 * Get Cache Key where storing Hosts Data.
 */
export function Hosts(
  server: string,
  params: TypesZabbix.ZabbixParamsHostGet,
): string {
  return cacheKey("hosts", server, params);
}
