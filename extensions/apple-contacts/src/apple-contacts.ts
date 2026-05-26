import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";
import { environment } from "@raycast/api";
import { formatPhoneNumber } from "./format-phone";
import { UnifiedContact } from "./types";

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  notes: string;
}

const execFileAsync = promisify(execFile);

function helperBin(): string {
  return join(environment.assetsPath, "contacts-helper");
}

async function runHelper(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(helperBin(), args, {
    maxBuffer: 50 * 1024 * 1024,
  });
  return stdout.trim();
}

// ─── Pure utility exports (tested in unit tests) ──────────────────────────────

export function normalizeKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function mergeContacts(
  a: UnifiedContact,
  b: UnifiedContact,
): UnifiedContact {
  return {
    ...a,
    firstName: a.firstName || b.firstName,
    lastName: a.lastName || b.lastName,
    company: a.company || b.company,
    primaryPhone: a.primaryPhone || b.primaryPhone,
    primaryEmail: a.primaryEmail || b.primaryEmail,
    jobTitle: a.jobTitle || b.jobTitle,
    emails: a.emails.length ? a.emails : b.emails,
    phones: a.phones.length ? a.phones : b.phones,
  };
}

export function deduplicateContacts(
  contacts: UnifiedContact[],
): UnifiedContact[] {
  const seen = new Map<string, UnifiedContact>();
  for (const contact of contacts) {
    const raw = contact.displayName;
    if (!raw || !raw.trim() || raw === "Unnamed Contact") {
      seen.set(contact.id, contact);
      continue;
    }
    const key = normalizeKey(raw);
    if (!seen.has(key)) {
      seen.set(key, contact);
    } else {
      seen.set(key, mergeContacts(seen.get(key)!, contact));
    }
  }
  return Array.from(seen.values());
}

// ─── Fast list fetch ──────────────────────────────────────────────────────────

export async function fetchAppleContacts(): Promise<UnifiedContact[]> {
  const json = await runHelper("list");
  const raw: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    org: string;
    primaryPhone: string;
    primaryEmail: string;
    phones: string[];
    emails: string[];
  }[] = JSON.parse(json || "[]");

  const contacts = raw
    .filter((r) => r.id)
    .map((r) => ({
      id: `apple:${r.id}`,
      displayName: r.name || r.firstName || r.lastName || "Unnamed Contact",
      firstName: r.firstName || undefined,
      lastName: r.lastName || undefined,
      emails: (r.emails ?? []).map((v) => ({ value: v })),
      phones: (r.phones ?? []).map((v) => ({ value: v })),
      company: r.org || undefined,
      primaryPhone: r.primaryPhone || undefined,
      primaryEmail: r.primaryEmail || undefined,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return deduplicateContacts(contacts);
}

// ─── Full detail fetch for a single contact ───────────────────────────────────

interface RawDetail {
  emails: { value: string; type: string }[];
  phones: { value: string; type: string }[];
  addresses: { formattedValue: string; type: string }[];
  jobTitle: string;
  notes: string;
  birthday: string;
  photoBase64: string;
}

function formatLabel(type: string): string | undefined {
  if (!type) return undefined;
  const clean = type.replace(/^_\$!<(.+)>!\$_$/, "$1");
  return clean || undefined;
}

export async function fetchContactDetail(
  contact: UnifiedContact,
): Promise<UnifiedContact> {
  const appleId = contact.id.replace("apple:", "");
  const json = await runHelper("detail", appleId);
  const raw: RawDetail = JSON.parse(json || "{}");

  return {
    ...contact,
    emails: (raw.emails ?? []).map((e) => ({
      value: e.value,
      type: formatLabel(e.type),
    })),
    phones: (raw.phones ?? []).map((p) => ({
      value: formatPhoneNumber(p.value),
      type: formatLabel(p.type),
    })),
    addresses: (raw.addresses ?? []).map((a) => ({
      formattedValue: a.formattedValue,
      type: formatLabel(a.type),
    })),
    jobTitle: raw.jobTitle || undefined,
    notes: raw.notes || undefined,
    birthday: raw.birthday || undefined,
    photoUrl: raw.photoBase64
      ? `data:image/jpeg;base64,${raw.photoBase64}`
      : undefined,
  };
}

// ─── Bulk photo fetch ─────────────────────────────────────────────────────────
// Returns a map of contact id (e.g. "apple:<uuid>") → data URL for all contacts
// that have image data. Uses a single native binary call for efficiency.

export async function fetchAllContactPhotos(): Promise<Record<string, string>> {
  const json = await runHelper("photos");
  const raw: { id: string; photoBase64: string }[] = JSON.parse(json || "[]");
  return Object.fromEntries(
    raw
      .filter((r) => r.id && r.photoBase64)
      .map((r) => [`apple:${r.id}`, `data:image/jpeg;base64,${r.photoBase64}`]),
  );
}

// ─── Delete a contact ─────────────────────────────────────────────────────────

export async function deleteAppleContact(appleId: string): Promise<void> {
  await runHelper("delete", appleId);
}

// ─── Create a new contact ─────────────────────────────────────────────────────

export async function createAppleContact(
  values: ContactFormValues,
): Promise<void> {
  await runHelper("create", JSON.stringify(values));
}

// ─── Update an existing contact ───────────────────────────────────────────────

export async function updateAppleContact(
  appleId: string,
  values: ContactFormValues,
): Promise<void> {
  await runHelper("update", appleId, JSON.stringify(values));
}
