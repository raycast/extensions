import { ZabbixClient } from "@api/zabbix/main";
import { ZabbixParamsTriggerGet } from "@api/zabbix/types";
import * as Types from "@ui/types";

export async function LoadData(
  params: ZabbixParamsTriggerGet,
  config?: Types.LocalStorageZabbixServer,
): Promise<Types.DataTriggersView[]> {
  if (!config) return [];
  const client = new ZabbixClient({ url: config.url, key: config.key });
  const data = await client.MethodTriggerGet(params);
  return data.result.map(
    (v) =>
      <Types.DataTriggersView>{
        server_name: config.name,
        server_uuid: config.uuid,
        ...v,
      },
  );
}
