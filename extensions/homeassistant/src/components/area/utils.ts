import { getHAWSConnection } from "@lib/common";

export interface HAArea {
  aliases?: string[];
  area_id: string;
  floor_id?: string | null;
  icon?: string | null;
  name?: string | null;
  picture?: string | null;
}

export async function getHAAreas() {
  const con = await getHAWSConnection();
  const res: HAArea[] | undefined = await con.sendMessagePromise({
    type: "config/area_registry/list",
  });
  return res;
}
