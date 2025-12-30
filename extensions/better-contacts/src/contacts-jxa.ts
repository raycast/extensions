import { execSync } from "child_process";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { environment } from "@raycast/api";
import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { getBinaryPathSync } from "./binary-manager";

export interface Contact {
  identifier: string;
  givenName: string;
  familyName: string;
  nickname: string;
  organizationName: string;
  jobTitle: string;
  departmentName: string;
  phoneNumbers: { label: string | null; value: string }[];
  emailAddresses: { label: string | null; value: string }[];
  postalAddresses: {
    label: string | null;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isoCountryCode?: string;
  }[];
  urlAddresses: { label: string | null; value: string }[];
  birthday: string | null;
  imageDataAvailable: boolean;
  thumbnailBase64: string | null;
}

export interface Group {
  identifier: string;
  name: string;
}

interface SwiftCommandResult {
  success: boolean;
  error?: string;
  contacts?: Contact[];
  groups?: Group[];
  authorizationStatus?: string;
  fromCache?: boolean;
  cacheAge?: number;
  dbPath?: string;
}

// SQLite database path (matches Swift helper)
function getDbPath(): string {
  return join(homedir(), "Library/Application Support/better-contacts/contacts.db");
}

// Find the Swift helper binary (downloaded at runtime)
function getSwiftHelperPath(): string | null {
  return getBinaryPathSync();
}

function runSwiftHelper(command: string, arg?: string): SwiftCommandResult {
  const helperPath = getSwiftHelperPath();
  if (!helperPath) {
    return { success: false, error: "Swift helper not found" };
  }

  try {
    const args = arg ? `${command} "${arg}"` : command;
    const output = execSync(`"${helperPath}" ${args}`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });

    return JSON.parse(output.trim()) as SwiftCommandResult;
  } catch (error) {
    console.error("Swift helper error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

// sql.js instance cache
let sqlJsPromise: Promise<Awaited<ReturnType<typeof initSqlJs>>> | null = null;

async function getSqlJs() {
  if (!sqlJsPromise) {
    // Load wasm from assets folder
    const wasmPath = join(environment.assetsPath, "sql-wasm.wasm");
    sqlJsPromise = initSqlJs({
      locateFile: () => wasmPath,
    });
  }
  return sqlJsPromise;
}

// Check if cache exists and is valid
function isCacheValid(): boolean {
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return false;
  }

  try {
    // Check file modification time as a quick proxy
    const stats = statSync(dbPath);
    const age = (Date.now() - stats.mtimeMs) / 1000;
    // Cache is valid for 5 minutes
    return age < 300;
  } catch {
    return false;
  }
}

// Helper to run a query and get results as objects
function queryAll(db: SqlJsDatabase, sql: string, params: (string | number | null)[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: Record<string, unknown>[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

// Read contacts directly from SQLite (fast!)
async function readContactsFromDb(): Promise<Contact[]> {
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return [];
  }

  const SQL = await getSqlJs();
  const fileBuffer = readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  try {
    // Get all contacts
    const contacts = queryAll(
      db,
      `
      SELECT identifier, given_name, family_name, nickname,
             organization_name, job_title, department_name,
             birthday, image_available
      FROM contacts
      ORDER BY given_name, family_name
    `,
    );

    return contacts.map((row) => {
      const identifier = row.identifier as string;

      const phones = queryAll(db, "SELECT label, value FROM phone_numbers WHERE contact_id = ?", [identifier]);
      const emails = queryAll(db, "SELECT label, value FROM email_addresses WHERE contact_id = ?", [identifier]);
      const postals = queryAll(
        db,
        `
        SELECT label, street, city, state, postal_code, country, iso_country_code
        FROM postal_addresses WHERE contact_id = ?
      `,
        [identifier],
      );
      const urls = queryAll(db, "SELECT label, value FROM url_addresses WHERE contact_id = ?", [identifier]);

      return {
        identifier,
        givenName: (row.given_name as string) || "",
        familyName: (row.family_name as string) || "",
        nickname: (row.nickname as string) || "",
        organizationName: (row.organization_name as string) || "",
        jobTitle: (row.job_title as string) || "",
        departmentName: (row.department_name as string) || "",
        phoneNumbers: phones.map((p) => ({
          label: (p.label as string) || null,
          value: (p.value as string) || "",
        })),
        emailAddresses: emails.map((e) => ({
          label: (e.label as string) || null,
          value: (e.value as string) || "",
        })),
        postalAddresses: postals.map((p) => ({
          label: (p.label as string) || null,
          street: (p.street as string) || "",
          city: (p.city as string) || "",
          state: (p.state as string) || "",
          postalCode: (p.postal_code as string) || "",
          country: (p.country as string) || "",
          isoCountryCode: (p.iso_country_code as string) || "",
        })),
        urlAddresses: urls.map((u) => ({
          label: (u.label as string) || null,
          value: (u.value as string) || "",
        })),
        birthday: (row.birthday as string) || null,
        imageDataAvailable: row.image_available === 1,
        thumbnailBase64: null, // Don't load thumbnails in list view
      };
    });
  } finally {
    db.close();
  }
}

export async function listContacts(): Promise<{ contacts: Contact[]; error?: string; fromCache?: boolean }> {
  // First, ensure cache exists
  if (!isCacheValid()) {
    // Sync from CNContactStore to SQLite
    const result = runSwiftHelper("sync");
    if (!result.success) {
      return { contacts: [], error: result.error };
    }
  }

  // Read directly from SQLite
  try {
    const contacts = await readContactsFromDb();
    return { contacts, fromCache: true };
  } catch (error) {
    console.error("SQLite read error:", error);
    return { contacts: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export function getContact(identifier: string): { contact: Contact | null; error?: string } {
  // For single contact, use Swift helper to get fresh data with thumbnail
  const result = runSwiftHelper("get", identifier);
  if (!result.success) {
    return { contact: null, error: result.error };
  }
  const contacts = result.contacts ?? [];
  return { contact: contacts.length > 0 ? contacts[0] : null };
}

export function syncContacts(): { error?: string } {
  // Force refresh from contacts database to SQLite
  const result = runSwiftHelper("sync");
  if (!result.success) {
    return { error: result.error };
  }
  return {};
}

export function deleteContact(identifier: string): { success: boolean; error?: string } {
  const result = runSwiftHelper("delete", identifier);
  return { success: result.success, error: result.error };
}

export function getDisplayName(contact: Contact): string {
  const parts: string[] = [];
  if (contact.givenName) parts.push(contact.givenName);
  if (contact.familyName) parts.push(contact.familyName);
  if (parts.length === 0 && contact.organizationName) {
    return contact.organizationName;
  }
  if (parts.length === 0 && contact.nickname) {
    return contact.nickname;
  }
  if (parts.length === 0) {
    return "No Name";
  }
  return parts.join(" ");
}

export function getSubtitle(contact: Contact): string {
  if (contact.organizationName) {
    return contact.organizationName;
  }
  if (contact.emailAddresses.length > 0) {
    return contact.emailAddresses[0].value;
  }
  if (contact.phoneNumbers.length > 0) {
    return contact.phoneNumbers[0].value;
  }
  return "";
}
