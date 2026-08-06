import type * as Types from "@ui/types";
import * as CacheKey from "@ui/cache";
import { ZabbixClient } from "@api/zabbix/main";
import { Cache, showToast, Toast } from "@raycast/api";
import {
  ZabbixParamsTriggerGet,
  ZabbixResponseEventGet,
  ZabbixResponseEventGetResult,
  ZabbixResponseTriggerGet,
} from "../../api/zabbix/types";

const cache = new Cache();

/* Load Problems Data */
export async function LoadData(
  ZabbixServer: Types.LocalStorageZabbixServer[],
  SelectedZabbixServer: string,
  Params: ZabbixParamsTriggerGet,
  SetData: React.Dispatch<
    React.SetStateAction<Types.DataProblemsView[] | undefined>
  >,
): Promise<void> {
  /* Deep Clone Config */
  let config = structuredClone(ZabbixServer);

  /* Filter Config */
  if (SelectedZabbixServer.toLowerCase() !== "all")
    config = config.filter((v) => v.uuid === SelectedZabbixServer);

  const data: Types.DataProblemsView[] = [];

  /* Promises */
  const promisesTriggerGet: Promise<ZabbixResponseTriggerGet>[] = [];

  /* Load Data */
  for (const item of config) {
    /* Get ZabbixClient and Fetch Data */
    const client = new ZabbixClient({ url: item.url, key: item.key });
    promisesTriggerGet.push(client.MethodTriggerGet(Params));

    /* Load Data from Cache */
    const cacheKey = CacheKey.Problems(item.uuid, Params);
    if (cache.has(cacheKey)) {
      try {
        const d: Types.DataProblemsView[] = JSON.parse(cache.get(cacheKey)!);
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
    await Promise.allSettled(promisesTriggerGet)
  ).entries()) {
    const name = config.at(index)?.name;
    const uuid = config.at(index)?.uuid;
    const url = config.at(index)?.url;
    const key = config.at(index)?.key;

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

    /* Remove Trigger with lowered severity */
    if (Params.min_severity)
      p.value.result = p.value.result.filter(
        (v) =>
          !v.lastEvent?.severity ||
          v.lastEvent.severity >= Params.min_severity!,
      );

    /* Get Event Data (parallel per server, non-mutating lookup) */
    let events: ZabbixResponseEventGet | undefined;
    let eventsMap: Map<string, ZabbixResponseEventGetResult> | undefined =
      undefined;
    const eventIds = p.value.result
      .map((v) => v.lastEvent?.eventid)
      .filter((v) => v !== undefined);
    if (name && url && key && eventIds.length)
      events = await LoadEvent(
        name,
        new ZabbixClient({ url: url, key: key }),
        eventIds,
      );
    if (events) eventsMap = new Map(events.result.map((e) => [e.eventid, e]));

    /* Map to DataProblemsView */
    const d = p.value.result.map((v) => {
      let event;
      if (eventsMap && v.lastEvent?.eventid) {
        event = eventsMap.get(v.lastEvent.eventid);
      }

      return <Types.DataProblemsView>{
        server_uuid: uuid,
        server_name: name,
        event_get_result: event,
        ...v,
      };
    });

    /* Save on Cache */
    if (uuid) cache.set(CacheKey.Problems(uuid, Params), JSON.stringify(d));

    /* Replace Cached Data with Fesh Data */
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
      const clockA = a.lastEvent?.clock;
      const clockB = b.lastEvent?.clock;
      if (!clockA || !clockB) return 0;
      if (clockA > clockB) return -1;
      if (clockA < clockB) return 1;
      return 0;
    });

  /* Set Merged Data */
  SetData(data);
}

/* Load Event Data */
async function LoadEvent(
  name: string,
  client: ZabbixClient,
  ids: string[],
): Promise<ZabbixResponseEventGet | undefined> {
  try {
    return await client.MethodEventGet({
      eventids: ids,
      selectAcknowledges: "extend",
      selectTags: "extend",
    });
  } catch (error) {
    console.warn(error);
    const msg = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: `Error Loading Zabbix Event Data from "${name}"`,
      message: msg,
    });
  }
}
