import type { Client } from "../api/client";
import { fetchAllContacts } from "../api/contacts";
import { fetchAllThirdparties } from "../api/thirdparties";
import type { Contact, Thirdparty } from "../api/types";
import type { FieldSpec } from "./fuzzy";

export type SearchIndex = {
  thirdparties: Thirdparty[];
  contacts: Contact[];
};

export const THIRDPARTY_FIELDS: FieldSpec<Thirdparty>[] = [
  { get: (t) => t.name, weight: 1 },
  { get: (t) => t.nameAlias, weight: 0.9 },
  { get: (t) => t.customerCode, weight: 0.7 },
  { get: (t) => t.email, weight: 0.6 },
  { get: (t) => t.phone, weight: 0.4 },
];

export const CONTACT_FIELDS: FieldSpec<Contact>[] = [
  { get: (c) => c.lastname, weight: 1 },
  { get: (c) => c.firstname, weight: 0.85 },
  { get: (c) => c.email, weight: 0.6 },
  { get: (c) => c.phonePro, weight: 0.4 },
  { get: (c) => c.phoneMobile, weight: 0.4 },
  { get: (c) => c.position, weight: 0.3 },
];

export async function loadIndex(client: Client): Promise<SearchIndex> {
  const [thirdparties, contacts] = await Promise.all([fetchAllThirdparties(client), fetchAllContacts(client)]);
  return { thirdparties, contacts };
}
