import type { Client } from "./client";
import { toContact, toContactDetail, type Contact, type ContactDetail, type RawContact } from "./types";

const PROPERTIES = "id,lastname,firstname,email,phone_pro,phone_mobile,socid,poste";

function assertId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid Dolibarr ID: ${id}`);
  }
  return id;
}

export async function fetchAllContacts(client: Client): Promise<Contact[]> {
  const rows = await client.all<RawContact>("/contacts", { properties: PROPERTIES });
  return rows.map(toContact);
}

/** Loaded live rather than filtered out of the search index, so a freshly created contact shows up. */
export async function fetchCompanyContacts(client: Client, thirdpartyId: number): Promise<Contact[]> {
  assertId(thirdpartyId);
  const rows = await client.list<RawContact>("/contacts", {
    thirdparty_ids: thirdpartyId,
    properties: PROPERTIES,
    limit: 200,
  });
  return rows.map(toContact).sort((a, b) => a.lastname.localeCompare(b.lastname, "de"));
}

export async function fetchContact(client: Client, id: number): Promise<ContactDetail> {
  assertId(id);
  return toContactDetail(await client.one<RawContact>(`/contacts/${id}`));
}
