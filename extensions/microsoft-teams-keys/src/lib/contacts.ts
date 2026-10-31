import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

export interface Contact {
  id: string;
  /** What the user types, for example "Anna" or "Boss". */
  name: string;
  /** The Teams sign-in address (UPN), usually the work email. */
  email: string;
}

const KEY = "contacts";

export async function loadContacts(): Promise<Contact[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Contact[];
    return Array.isArray(parsed) ? parsed.filter((c) => c && c.id && c.name && c.email) : [];
  } catch {
    return [];
  }
}

export async function saveContacts(contacts: Contact[]): Promise<void> {
  const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name));
  await LocalStorage.setItem(KEY, JSON.stringify(sorted));
}

export async function upsertContact(contact: Omit<Contact, "id"> & { id?: string }): Promise<Contact> {
  const contacts = await loadContacts();
  const saved: Contact = { id: contact.id ?? randomUUID(), name: contact.name.trim(), email: contact.email.trim() };
  const index = contacts.findIndex((c) => c.id === saved.id);
  if (index >= 0) contacts[index] = saved;
  else contacts.push(saved);
  await saveContacts(contacts);
  return saved;
}

export async function deleteContact(id: string): Promise<void> {
  await saveContacts((await loadContacts()).filter((c) => c.id !== id));
}

export function isEmail(value: string): boolean {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value.trim());
}

export type Resolved = { kind: "email"; email: string; label: string } | { kind: "search"; query: string };

/**
 * Turns what the user typed into an address Teams can open directly.
 *
 * An email wins. Then a saved contact: an exact name, else the one contact
 * whose name starts with or contains the text. Several matches are not
 * guessed: the text goes to Teams search instead, like an unknown name.
 */
export async function resolvePerson(input: string): Promise<Resolved> {
  const text = input.trim();
  if (isEmail(text)) return { kind: "email", email: text, label: text };

  const needle = text.toLocaleLowerCase();
  const contacts = await loadContacts();
  const exact = contacts.filter((c) => c.name.toLocaleLowerCase() === needle);
  const prefix = contacts.filter((c) => c.name.toLocaleLowerCase().startsWith(needle));
  const partial = contacts.filter(
    (c) => c.name.toLocaleLowerCase().includes(needle) || c.email.toLocaleLowerCase().startsWith(needle),
  );
  const match = [exact, prefix, partial].find((list) => list.length === 1)?.[0];
  if (match) return { kind: "email", email: match.email, label: match.name };
  return { kind: "search", query: text };
}
