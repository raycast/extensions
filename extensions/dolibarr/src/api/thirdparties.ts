import type { Client } from "./client";
import { toThirdparty, toThirdpartyDetail, type RawThirdparty, type Thirdparty, type ThirdpartyDetail } from "./types";

const PROPERTIES = "id,name,name_alias,email,phone,client,code_client";

function assertId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid Dolibarr ID: ${id}`);
  }
  return id;
}

export async function fetchAllThirdparties(client: Client): Promise<Thirdparty[]> {
  const rows = await client.all<RawThirdparty>("/thirdparties", { properties: PROPERTIES });
  return rows.map(toThirdparty);
}

/** Full master data including both notes — none of it is carried in the search index. */
export async function fetchThirdparty(client: Client, id: number): Promise<ThirdpartyDetail> {
  assertId(id);
  return toThirdpartyDetail(await client.one<RawThirdparty>(`/thirdparties/${id}`));
}
