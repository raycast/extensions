import { ConnectionsListResponse, ContactGroup, ContactGroupsListResponse, Person, SearchResponse } from "./types";

const BASE_URL = "https://people.googleapis.com/v1";
const PERSON_FIELDS =
  "names,emailAddresses,phoneNumbers,photos,organizations,addresses,biographies,birthdays,memberships";

async function fetchApi<T>(url: string, token: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication expired — please re-authorize in extension preferences.");
    }
    const errorBody = await response.text();
    throw new Error(`Google API error ${response.status}: ${errorBody}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type SortOrder = "FIRST_NAME_ASCENDING" | "LAST_NAME_ASCENDING";

export async function fetchAllContacts(
  token: string,
  sortOrder: SortOrder = "FIRST_NAME_ASCENDING",
): Promise<Person[]> {
  const all: Person[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      personFields: PERSON_FIELDS,
      pageSize: "1000",
      sortOrder,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetchApi<ConnectionsListResponse>(`${BASE_URL}/people/me/connections?${params}`, token);
    if (res.connections) all.push(...res.connections);
    pageToken = res.nextPageToken;
  } while (pageToken);
  return all;
}

export async function searchContacts(token: string, query: string): Promise<Person[]> {
  // Warmup request required by Google before real searches return results
  await fetchApi<SearchResponse>(`${BASE_URL}/people:searchContacts?query=&readMask=names`, token);
  if (!query) return [];
  const params = new URLSearchParams({
    query,
    readMask: PERSON_FIELDS,
    pageSize: "30",
  });
  const res = await fetchApi<SearchResponse>(`${BASE_URL}/people:searchContacts?${params}`, token);
  return res.results?.map((r) => r.person) ?? [];
}

export async function getContact(token: string, resourceName: string): Promise<Person> {
  return fetchApi<Person>(`${BASE_URL}/${resourceName}?personFields=${PERSON_FIELDS}`, token);
}

export async function createContact(token: string, person: Partial<Person>): Promise<Person> {
  return fetchApi<Person>(`${BASE_URL}/people:createContact?personFields=${PERSON_FIELDS}`, token, {
    method: "POST",
    body: JSON.stringify(person),
  });
}

export async function updateContact(
  token: string,
  resourceName: string,
  person: Partial<Person>,
  updatePersonFields: string,
): Promise<Person> {
  const params = new URLSearchParams({
    updatePersonFields,
    personFields: PERSON_FIELDS,
  });
  return fetchApi<Person>(`${BASE_URL}/${resourceName}:updateContact?${params}`, token, {
    method: "PATCH",
    body: JSON.stringify(person),
  });
}

export async function deleteContact(token: string, resourceName: string): Promise<void> {
  await fetchApi<void>(`${BASE_URL}/${resourceName}:deleteContact`, token, {
    method: "DELETE",
  });
}

export async function starContact(token: string, resourceName: string): Promise<void> {
  await fetchApi<void>(`${BASE_URL}/contactGroups/starred/members:modify`, token, {
    method: "POST",
    body: JSON.stringify({ resourceNamesToAdd: [resourceName] }),
  });
}

export async function unstarContact(token: string, resourceName: string): Promise<void> {
  await fetchApi<void>(`${BASE_URL}/contactGroups/starred/members:modify`, token, {
    method: "POST",
    body: JSON.stringify({ resourceNamesToRemove: [resourceName] }),
  });
}

export async function fetchContactGroups(token: string): Promise<ContactGroup[]> {
  const res = await fetchApi<ContactGroupsListResponse>(
    `${BASE_URL}/contactGroups?pageSize=1000&groupFields=name,groupType,memberCount`,
    token,
  );
  return res.contactGroups ?? [];
}
