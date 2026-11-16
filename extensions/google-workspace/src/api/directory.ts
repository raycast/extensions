const ENDPOINT = "https://people.googleapis.com/v1/people:listDirectoryPeople";

export const USAGE_STORAGE_KEY = "directory-usage";
export const PINS_STORAGE_KEY = "directory-pins";

/** Pins and recents are stored per Google account so switching accounts never shows another account's data. */
export const usageStorageKey = (accountId: string) => `${USAGE_STORAGE_KEY}:${accountId}`;
export const pinsStorageKey = (accountId: string) => `${PINS_STORAGE_KEY}:${accountId}`;

export type DirectoryPhone = { value: string; type?: string };

export type DirectoryPerson = {
  id: string;
  name: string;
  givenName?: string;
  familyName?: string;
  emails: string[];
  phones: DirectoryPhone[];
  title?: string;
  department?: string;
  external: boolean;
};

/** Error raised by the directory listing; `kind` tells the UI which message to show. */
export class DirectoryError extends Error {
  kind: "unavailable" | "insufficient-scope" | "other";
  status: number;

  constructor(kind: DirectoryError["kind"], status: number, message: string) {
    super(message);
    this.name = "DirectoryError";
    this.kind = kind;
    this.status = status;
  }
}

type Metadata = { primary?: boolean };
type ApiPerson = {
  resourceName: string;
  names?: { displayName?: string; givenName?: string; familyName?: string; metadata?: Metadata }[];
  emailAddresses?: { value?: string; metadata?: Metadata }[];
  phoneNumbers?: { value?: string; type?: string; formattedType?: string }[];
  organizations?: { title?: string; department?: string; metadata?: Metadata }[];
};
type ApiPage = { people?: ApiPerson[]; nextPageToken?: string };

function toPerson(person: ApiPerson, external: boolean): DirectoryPerson {
  const names = person.names ?? [];
  const primaryName = names.find((n) => n.metadata?.primary) ?? names[0];
  const orgs = person.organizations ?? [];
  const org = orgs.find((o) => o.metadata?.primary) ?? orgs[0];

  return {
    id: person.resourceName,
    name: primaryName?.displayName ?? "",
    givenName: primaryName?.givenName,
    familyName: primaryName?.familyName,
    emails: (person.emailAddresses ?? [])
      .filter((e): e is { value: string; metadata?: Metadata } => Boolean(e.value))
      // Primary email first, otherwise keep Google's order.
      .sort((a, b) => Number(b.metadata?.primary ?? false) - Number(a.metadata?.primary ?? false))
      .map((e) => e.value),
    phones: (person.phoneNumbers ?? [])
      .filter((p): p is { value: string; type?: string; formattedType?: string } => Boolean(p.value))
      .map((p) => ({ value: p.value, type: p.formattedType ?? p.type })),
    title: org?.title || undefined,
    department: org?.department || undefined,
    external,
  };
}

async function toDirectoryError(response: Response): Promise<DirectoryError> {
  const body = await response.text();
  let message = "";
  let apiStatus = "";
  try {
    const error = JSON.parse(body).error ?? {};
    message = error.message ?? "";
    apiStatus = error.status ?? "";
  } catch {
    // Non-JSON body (e.g. HTML): keep it out of the message.
  }
  const text = `${body} ${message}`;
  const status = response.status;

  let kind: DirectoryError["kind"] = "other";
  if (status === 403 && /ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient.*scope/i.test(text)) {
    kind = "insufficient-scope";
  } else if (
    (status === 403 && !/SERVICE_DISABLED|has not been used|is disabled/i.test(text)) ||
    (status === 400 && (apiStatus === "FAILED_PRECONDITION" || /workspace|g suite|domain|directory/i.test(text)))
  ) {
    kind = "unavailable";
  }

  const short = (message || response.statusText || "Request failed").slice(0, 200);
  return new DirectoryError(kind, status, `Google directory request failed (${status}): ${short}`);
}

async function listSource(token: string, source: string, external: boolean): Promise<DirectoryPerson[]> {
  const people: DirectoryPerson[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      readMask: "names,emailAddresses,organizations,phoneNumbers",
      pageSize: "1000",
      sources: source,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetch(`${ENDPOINT}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw await toDirectoryError(response);

    const page = (await response.json()) as ApiPage;
    for (const person of page.people ?? []) people.push(toPerson(person, external));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return people;
}

/** Fetch the full Workspace directory (domain profiles, plus domain contacts flagged `external`). */
export async function fetchDirectory(token: string): Promise<DirectoryPerson[]> {
  const [profiles, contacts] = await Promise.all([
    listSource(token, "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE", false),
    listSource(token, "DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT", true).catch((error) => {
      // Only a restricted source is tolerated; transient failures must not overwrite a complete cache.
      if (error instanceof DirectoryError && error.kind === "unavailable") return [] as DirectoryPerson[];
      throw error;
    }),
  ]);

  const byId = new Map<string, DirectoryPerson>();
  for (const person of [...profiles, ...contacts]) {
    if (!byId.has(person.id)) byId.set(person.id, person);
  }
  return [...byId.values()].filter((p) => p.name || p.emails.length > 0);
}

/** Split people into pinned (in pin order) and others (most recently used first, then alphabetical). */
export function sortPeople(
  people: DirectoryPerson[],
  usage: Record<string, number>,
  pins: string[],
): { pinned: DirectoryPerson[]; others: DirectoryPerson[] } {
  const byId = new Map(people.map((p) => [p.id, p]));
  const pinned = pins.map((id) => byId.get(id)).filter((p): p is DirectoryPerson => Boolean(p));
  const pinSet = new Set(pins);
  const label = (p: DirectoryPerson) => p.name || p.emails[0] || "";

  const others = people
    .filter((p) => !pinSet.has(p.id))
    .sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0) || label(a).localeCompare(label(b)));

  return { pinned, others };
}
