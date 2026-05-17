import { SearchResult, SourceContext, SourceOutput } from "../types";
import { matchesAllTerms, matchesAny, parseQuery, runWithStdin } from "./util";

type Contact = {
  uuid: string;
  display: string;
  org?: string;
  emails: string[];
  phones: string[];
  imageBase64?: string;
};

let lastError: string | null = null;
let cache: { fetchedAt: number; rows: Contact[] } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function getContactsError(): string | null {
  return lastError;
}

export async function deleteContact(identifier: string, signal: AbortSignal): Promise<void> {
  const script = `
import Contacts
import Foundation

let identifier = CommandLine.arguments.dropFirst().first ?? ""
if identifier.isEmpty {
  fputs("missing contact identifier\\n", stderr)
  exit(4)
}
let store = CNContactStore()
let sema = DispatchSemaphore(value: 0)
var granted = false
var errMsg = ""

store.requestAccess(for: .contacts) { ok, err in
  granted = ok
  if let err = err { errMsg = err.localizedDescription }
  sema.signal()
}
_ = sema.wait(timeout: .now() + 25)

if !granted {
  fputs("denied: \\(errMsg)\\n", stderr)
  exit(2)
}

do {
  let keys: [CNKeyDescriptor] = [CNContactIdentifierKey as CNKeyDescriptor]
  var contactToDelete: CNContact?

  func findInContainer(_ containerID: String?) throws {
    guard contactToDelete == nil else { return }
    let req = CNContactFetchRequest(keysToFetch: keys)
    if let containerID = containerID {
      req.predicate = CNContact.predicateForContactsInContainer(withIdentifier: containerID)
    }
    try store.enumerateContacts(with: req) { contact, stop in
      if contact.identifier == identifier {
        contactToDelete = contact
        stop.pointee = true
      }
    }
  }

  let containers = try store.containers(matching: nil)
  if containers.isEmpty {
    try findInContainer(nil)
  } else {
    for container in containers {
      try findInContainer(container.identifier)
      if contactToDelete != nil { break }
    }
  }

  guard let contact = contactToDelete else {
    fputs("contact not found\\n", stderr)
    exit(3)
  }

  let request = CNSaveRequest()
  request.delete(contact.mutableCopy() as! CNMutableContact)
  try store.execute(request)
  print("ok")
} catch {
  fputs("delete failed: \\(error.localizedDescription)\\n", stderr)
  exit(1)
}
`;
  await runWithStdin("/usr/bin/swift", ["-", identifier], Buffer.from(script), signal, 20_000);
  cache = null;
}

/**
 * Pull contacts from the Contacts framework via a Swift subprocess.
 *
 * The previous sqlite3 approach against ~/Library/Application Support/AddressBook/
 * fails with "unable to open database file (14)" on recent macOS even with FDA —
 * Apple has tightened access to the live DB. The Contacts framework is the
 * supported path and prompts the user via TCC on first run.
 */
async function loadContactsViaContactsFramework(signal: AbortSignal): Promise<Contact[] | null> {
  const script = `
import Contacts
import Foundation

let store = CNContactStore()
let sema = DispatchSemaphore(value: 0)
var granted = false
var errMsg = ""

store.requestAccess(for: .contacts) { ok, err in
  granted = ok
  if let err = err { errMsg = err.localizedDescription }
  sema.signal()
}
_ = sema.wait(timeout: .now() + 25)

if !granted {
  print("{\\"error\\":\\"denied: \\(errMsg)\\"}")
  exit(0)
}

let keys: [CNKeyDescriptor] = [
  CNContactIdentifierKey as CNKeyDescriptor,
  CNContactGivenNameKey as CNKeyDescriptor,
  CNContactFamilyNameKey as CNKeyDescriptor,
  CNContactMiddleNameKey as CNKeyDescriptor,
  CNContactNicknameKey as CNKeyDescriptor,
  CNContactOrganizationNameKey as CNKeyDescriptor,
  CNContactEmailAddressesKey as CNKeyDescriptor,
  CNContactPhoneNumbersKey as CNKeyDescriptor,
  CNContactThumbnailImageDataKey as CNKeyDescriptor,
]

struct Out: Encodable {
  let id: String
  let display: String
  let org: String
  let emails: [String]
  let phones: [String]
  let imageBase64: String?
}

var rows: [Out] = []

func fetchFromContainer(_ containerID: String?) throws {
  let req = CNContactFetchRequest(keysToFetch: keys)
  if let containerID = containerID {
    req.predicate = CNContact.predicateForContactsInContainer(withIdentifier: containerID)
  }
  try store.enumerateContacts(with: req) { c, _ in
    let nameParts = [c.givenName, c.middleName, c.familyName].filter { !$0.isEmpty }
    var display = nameParts.joined(separator: " ")
    if display.isEmpty { display = c.nickname }
    if display.isEmpty { display = c.organizationName }
    if display.isEmpty { return }
    let emails = c.emailAddresses.map { $0.value as String }
    let phones = c.phoneNumbers.map { $0.value.stringValue }
    let imageB64 = c.thumbnailImageData?.base64EncodedString()
    rows.append(Out(
      id: c.identifier,
      display: display,
      org: c.organizationName,
      emails: emails,
      phones: phones,
      imageBase64: imageB64
    ))
  }
}

// Enumerate per-container to surface contacts across all accounts (iCloud, Google, On My Mac).
// An unconstrained fetch sometimes only returns the default container on recent macOS.
do {
  let containers = try store.containers(matching: nil)
  if containers.isEmpty {
    try fetchFromContainer(nil)
  } else {
    var seen = Set<String>()
    for container in containers {
      try fetchFromContainer(container.identifier)
    }
    rows = rows.filter { seen.insert($0.id).inserted }
  }
} catch {
  print("{\\"error\\":\\"fetch failed: \\(error.localizedDescription)\\"}")
  exit(0)
}

let data = try JSONEncoder().encode(rows)
FileHandle.standardOutput.write(data)
`;
  let raw: string;
  try {
    raw = await runWithStdin("/usr/bin/swift", ["-"], Buffer.from(script), signal, 200_000_000);
  } catch (e) {
    lastError = `Contacts/swift failed: ${(e as Error).message}`;
    return null;
  }
  if (!raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    lastError = `Contacts returned non-JSON: ${raw.slice(0, 200)}`;
    return null;
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as object)) {
    lastError = `Contacts access denied. Grant Raycast access in System Settings → Privacy & Security → Contacts.`;
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  return (
    parsed as Array<{
      id: string;
      display: string;
      org: string;
      emails: string[];
      phones: string[];
      imageBase64: string | null;
    }>
  ).map((c) => ({
    uuid: c.id,
    display: c.display,
    org: c.org || undefined,
    emails: c.emails,
    phones: c.phones,
    imageBase64: c.imageBase64 || undefined,
  }));
}

export async function searchContacts(ctx: SourceContext): Promise<SourceOutput> {
  lastError = null;
  const empty = { results: [] as SearchResult[], total: 0 };
  const parsed = parseQuery(ctx.query);
  if (parsed.extensions.length > 0) return empty;
  if (parsed.terms.length === 0) return empty;

  let rows: Contact[] | null;
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    rows = cache.rows;
  } else {
    rows = await loadContactsViaContactsFramework(ctx.signal);
    if (rows) cache = { fetchedAt: Date.now(), rows };
  }
  if (!rows) return empty;

  const results: SearchResult[] = [];
  let total = 0;
  for (const c of rows) {
    const hay = [c.display, c.org ?? "", ...c.emails, ...c.phones].join(" ");
    if (matchesAny(hay, ctx.exclude ?? [])) continue;
    if (!matchesAllTerms(hay, parsed.terms)) continue;
    total++;
    if (results.length >= ctx.limit) continue;
    const subtitleBits: string[] = [];
    if (c.emails[0]) subtitleBits.push(c.emails[0]);
    if (c.phones[0]) subtitleBits.push(c.phones[0]);
    if (!subtitleBits.length && c.org) subtitleBits.push(c.org);
    results.push({
      id: "contact:" + c.uuid,
      kind: "contact",
      title: c.display,
      subtitle: subtitleBits.join(" · "),
      url: `addressbook://${c.uuid}`,
      emails: c.emails,
      phones: c.phones,
      imageBase64: c.imageBase64,
    });
  }
  return { results, total };
}
