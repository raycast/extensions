// Recipients in the composer and the event form. Raycast forms have no text
// field that autocompletes, so recipients are chips (a tag picker) over the
// contacts the form knows: Spark's 1000 most-used ones, anyone filled in, and
// anyone added by hand with Add Address, since a tag picker can't take a
// typed value.
//
// No Raycast imports here: this file runs under `node --test` as-is.

import { EMAIL } from "./attendees.ts";

export interface Person {
  email: string;
  name?: string;
}

/// "Name <email>", or just the address: tag pickers have no subtitle, and
/// people with the same name need telling apart. It's also what typing in
/// the picker matches, so an address or a domain finds them too.
export function personLabel(person: Person): string {
  const name = person.name?.trim();
  return name && name.toLowerCase() !== person.email.toLowerCase() ? `${name} <${person.email}>` : person.email;
}

/// Adds `people` to the pool the pickers draw from, keyed by lower-case
/// address; a later entry supplies a name the pool didn't have. Returns the
/// same map when nothing changed, so React can skip the update.
export function mergePeople(pool: Map<string, Person>, people: Person[]): Map<string, Person> {
  let next = pool;
  for (const person of people) {
    const email = person.email.trim();
    const key = email.toLowerCase();
    if (!key) continue;
    const known = next.get(key);
    const name = known?.name || person.name?.trim() || undefined;
    if (known && known.name === name) continue;
    if (next === pool) next = new Map(pool);
    next.set(key, { email: known?.email ?? email, name });
  }
  return next;
}

/// Addresses from a prop or a stored draft: a comma-separated string (older
/// drafts, callers) or an array (the tag picker).
export function addressList(value: string | string[] | undefined): string[] {
  const items = Array.isArray(value) ? value : (value ?? "").split(/[,;]/);
  const seen = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter((item) => item && !seen.has(item.toLowerCase()) && seen.add(item.toLowerCase()));
}

/// Separators inside a quoted display name or angle brackets belong to the
/// entry. Escaped quotes must not end a quoted name.
function splitAddresses(text: string): string[] {
  const entries: string[] = [];
  let start = 0;
  let quoted = false;
  let inAngleBrackets = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === "\\") {
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted) {
      if (char === "<") inAngleBrackets = true;
      else if (char === ">") inAngleBrackets = false;
      else if (!inAngleBrackets && /[,;\n]/.test(char)) {
        entries.push(text.slice(start, i));
        start = i + 1;
      }
    }
  }
  entries.push(text.slice(start));
  return entries;
}

/// What was typed into Add Address: one or more entries separated by commas,
/// semicolons, or newlines, each an address or "Name <address>". Entries without a valid
/// address come back in `invalid`, for the form to point out.
export function parseAddresses(text: string): { people: Person[]; invalid: string[] } {
  const people: Person[] = [];
  const invalid: string[] = [];
  for (const raw of splitAddresses(text)) {
    const entry = raw.trim();
    if (!entry) continue;
    const named = entry.match(/^(.*?)\s*<([^<>]*)>$/);
    const email = (named ? named[2] : entry).trim();
    const displayName = named?.[1].trim();
    const name =
      displayName?.replace(/^"(.*)"$/s, (_, quoted: string) => quoted.replace(/\\(.)/gs, "$1")).trim() || undefined;
    if (EMAIL.test(email)) people.push({ email, name });
    else invalid.push(entry);
  }
  return { people, invalid };
}
