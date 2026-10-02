import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { LocalStorage } from "@raycast/api";

const execFileAsync = promisify(execFile);

const CACHE_KEY = "contacts.v1";
const CACHE_TIMESTAMP_KEY = "contacts.v1.ts";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export type Phone = {
  value: string;
  label: string;
};

export type Contact = {
  id: string;
  name: string;
  phones: Phone[];
};

// Bulk JXA fetch: one bridge call per property, then assemble in JS.
// ~1s for 200 contacts vs >15s with per-element calls.
const JXA_SCRIPT = `
function run() {
  const Contacts = Application('Contacts');
  const people = Contacts.people;
  const names = people.name();
  const ids = people.id();
  const valuesPerPerson = people.phones.value();
  const labelsPerPerson = people.phones.label();
  const out = [];
  for (let i = 0; i < names.length; i++) {
    const values = valuesPerPerson[i] || [];
    if (values.length === 0) continue;
    const labels = labelsPerPerson[i] || [];
    const name = names[i];
    if (!name) continue;
    const phones = [];
    for (let j = 0; j < values.length; j++) {
      const v = values[j];
      if (v == null || v === '') continue;
      phones.push({ value: String(v), label: String(labels[j] || '') });
    }
    if (phones.length === 0) continue;
    out.push({ id: String(ids[i] || i), name: String(name), phones });
  }
  return JSON.stringify(out);
}
`;

const PHONE_LABEL_PRIORITY = ["mobile", "iphone", "main", "work", "home"];

// Cut at the first extension marker so we don't dial "ext. 123" digits.
const EXTENSION_SEPARATOR = /\b(?:ext\.?|x|extension|#)\s*\d.*$/i;

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(EXTENSION_SEPARATOR, "");
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

// Loose validation: a real phone number has at least 5 digits and at most 18.
export function isDialable(normalized: string): boolean {
  const digits = normalized.replace(/^\+/, "");
  return digits.length >= 5 && digits.length <= 18;
}

export function cleanLabel(label: string): string {
  // Apple wraps labels like "_$!<Mobile>!$_"
  const match = label.match(/<([^>]+)>/);
  const base = (match ? match[1] : label).trim();
  return base || "Phone";
}

export function rankPhones(phones: Phone[]): Phone[] {
  return [...phones].sort((a, b) => {
    const ai = PHONE_LABEL_PRIORITY.indexOf(cleanLabel(a.label).toLowerCase());
    const bi = PHONE_LABEL_PRIORITY.indexOf(cleanLabel(b.label).toLowerCase());
    const aw = ai === -1 ? PHONE_LABEL_PRIORITY.length : ai;
    const bw = bi === -1 ? PHONE_LABEL_PRIORITY.length : bi;
    return aw - bw;
  });
}

async function fetchFromContactsApp(): Promise<Contact[]> {
  const { stdout } = await execFileAsync(
    "osascript",
    ["-l", "JavaScript", "-e", JXA_SCRIPT],
    {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 15_000,
    },
  );
  const raw = JSON.parse(stdout) as Contact[];
  return raw
    .map((c) => ({
      ...c,
      phones: rankPhones(
        dedupePhones(
          c.phones.map(processPhone).filter((p) => isDialable(p.value)),
        ),
      ),
    }))
    .filter((c) => c.phones.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function processPhone(p: Phone): Phone {
  return { value: normalizePhone(p.value), label: cleanLabel(p.label) };
}

function dedupePhones(phones: Phone[]): Phone[] {
  const seen = new Set<string>();
  const out: Phone[] = [];
  for (const p of phones) {
    if (seen.has(p.value)) continue;
    seen.add(p.value);
    out.push(p);
  }
  return out;
}

export async function loadContacts(force = false): Promise<Contact[]> {
  if (!force) {
    const cachedRaw = await LocalStorage.getItem<string>(CACHE_KEY);
    const tsRaw = await LocalStorage.getItem<string>(CACHE_TIMESTAMP_KEY);
    if (cachedRaw && tsRaw) {
      const age = Date.now() - Number(tsRaw);
      if (age < CACHE_TTL_MS) {
        try {
          return JSON.parse(cachedRaw) as Contact[];
        } catch {
          // fall through to refetch
        }
      }
    }
  }
  const fresh = await fetchFromContactsApp();
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
  await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
  return fresh;
}
