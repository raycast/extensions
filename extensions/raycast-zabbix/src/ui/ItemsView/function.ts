import { ZabbixClient } from "@api/zabbix/main";
import { ZabbixParamsItemGet } from "@api/zabbix/types";
import * as Types from "@ui/types";

export async function LoadData(
  params: ZabbixParamsItemGet,
  config?: Types.LocalStorageZabbixServer,
): Promise<Types.DataItemsView[]> {
  if (!config) return [];
  const client = new ZabbixClient({ url: config.url, key: config.key });
  const data = await client.MethodItemGet(params);
  return data.result.map(
    (v) =>
      <Types.DataItemsView>{
        server_name: config.name,
        server_uuid: config.uuid,
        ...v,
      },
  );
}
