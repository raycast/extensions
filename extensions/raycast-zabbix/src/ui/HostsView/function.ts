import type * as Types from "@ui/types";
import * as CacheKey from "@ui/cache";
import { ZabbixClient } from "@api/zabbix/main";
import { Cache, showToast, Toast } from "@raycast/api";
import {
  ZabbixParamsHostGet,
  ZabbixResponseHostGet,
} from "../../api/zabbix/types";

const cache = new Cache();

/* Load Hosts Data */
export async function LoadData(
  ZabbixServer: Types.LocalStorageZabbixServer[],
  SelectedZabbixServer: string,
  Params: ZabbixParamsHostGet,
  SetData: React.Dispatch<
    React.SetStateAction<Types.DataHostsView[] | undefined>
  >,
): Promise<void> {
  /* Deep Clone Config */
  let config = structuredClone(ZabbixServer);

  /* Filter Config */
  if (SelectedZabbixServer.toLowerCase() !== "all")
    config = config.filter((v) => v.uuid === SelectedZabbixServer);

  const data: Types.DataHostsView[] = [];

  /* Promises */
  const promisesHostGet: Promise<ZabbixResponseHostGet>[] = [];

  /* Load Data */
  for (const item of config) {
    /* Get ZabbixClient and Fetch Data */
    const client = new ZabbixClient({ url: item.url, key: item.key });
    promisesHostGet.push(client.MethodHostGet(Params));

    /* Load Data from Cache */
    const cacheKey = CacheKey.Hosts(item.uuid, Params);
    if (cache.has(cacheKey)) {
      try {
        const d: Types.DataHostsView[] = JSON.parse(cache.get(cacheKey)!);
        data.push(...d);
      } catch (error) {
        console.warn(error);
        cache.remove(cacheKey);
      }
    }
  }

  /* Set Cached Data */
  SetData(data);

  /* Set Fresh Data */
  let lastIndex = 0;
  for (const [index, p] of (
    await Promise.allSettled(promisesHostGet)
  ).entries()) {
    const name = config.at(index)?.name;
    const uuid = config.at(index)?.uuid;

    /* Log Error */
    if (p.status === "rejected") {
      console.warn(`Zabbix Server "${name}"`, p.reason);
      const reason =
        p.reason instanceof Error ? p.reason.message : String(p.reason);
      await showToast({
        style: Toast.Style.Failure,
        title: `Error Loading Zabbix Data from "${name}"`,
        message: reason,
      });
      continue;
    }

    /* Map to DataHostsView */
    const d = p.value.result.map((v) => {
      return <Types.DataHostsView>{
        server_uuid: uuid,
        server_name: name,
        ...v,
      };
    });

    /* Save on Cache */
    if (uuid) cache.set(CacheKey.Hosts(uuid, Params), JSON.stringify(d));

    /* Replace Cached Data with Fresh Data */
    const startIndex = data.findIndex((v) => v.server_uuid === uuid);
    if (startIndex === -1) {
      data.splice(lastIndex, 0, ...d);
    } else {
      const number =
        data.findLastIndex((v) => v.server_uuid === uuid) - startIndex + 1;
      data.splice(startIndex, number, ...d);
    }
    lastIndex = data.findLastIndex((v) => v.server_uuid === uuid);
  }

  /* Order Data when fetching multiple zabbix server */
  if (config.length > 1)
    data.sort((a, b) => {
      const nameA = a.name;
      const nameB = b.name;
      if (!nameA || !nameB) return 0;
      if (nameA > nameB) return -1;
      if (nameA < nameB) return 1;
      return 0;
    });

  /* Set Merged Data */
  SetData(data);
}
