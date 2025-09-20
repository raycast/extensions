import { getHAWSConnection } from "@lib/common";

export interface HADevice {
  area_id?: string | null;
  configuration_url?: string | null;
  config_entries?: string[] | null;
  connections?: string[] | null;
  entry_type?: string | null;
  id: string;
  manufacturer?: string | null;
  model?: string | null;
  name?: string | null;
  primary_config_entry?: string | null;
  serial_number?: string | null;
  sw_version?: string | null;
  // currently not supported attributes
  // disabled_by
  // hw_version
  // identifiers
  // labels
  // name_by_user
  // via_device_id
}

export async function getHADevices() {
  const con = await getHAWSConnection();
  const res: HADevice[] | undefined = await con.sendMessagePromise({
    type: "config/device_registry/list",
  });
  return res;
}
