const BASE_URL = "https://selfservice.cedarville.edu";

export interface DirectoryPerson {
  Id: string;
  isFaculty?: boolean; // resolved from Info/Json; heuristic until confirmed
  Username: string;
  FirstName: string;
  LastName: string;
  MiddleName: string | null;
  Nickname: string | null;
  AddressCity: string | null;
  AddressState: string | null;
  AddressCountry: string | null;
  DepartmentDescription: string | null;
  Title: string | null;
  OfficeBuildingCode: string | null;
  OfficeBuildingName: string | null;
  OfficeRoom: string | null;
  OfficePhone: string | null;
  DormCode: string | null;
  DormName: string | null;
  DormRoom: string | null;
  StudentType: string | null;
  StudentClass: string | null;
  studentWorker: boolean | null;
  empInactive: boolean | null;
  PhotoUrl: string | null;
}

export class AuthRequiredError extends Error {
  constructor(public readonly signInUrl: string) {
    super("Authentication required");
    this.name = "AuthRequiredError";
  }
}

function makeHeaders(cookie?: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    referer: `${BASE_URL}/cedarinfo/directory`,
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  };
  if (cookie) headers["cookie"] = cookie;
  return headers;
}

export interface ScheduleItem {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  day: string;
  type: string;
}

export interface Term {
  code: string;
  desc: string;
  start: string;
  end: string;
}

export interface PersonInfo {
  faculty: {
    isFaculty: boolean;
    facultyDepts: { code: string; description: string; division: string }[];
    scheduleItems: ScheduleItem[];
    term: { key: string; description: string };
  };
  student: {
    isStudent: boolean;
    scheduleItems: ScheduleItem[];
    programs: string[];
    majors: { code: string; description: string }[];
    minors: { code: string; description: string }[];
    concentrations: { code: string; description: string }[];
    advisors: { id: string; name: string }[];
    term: { key: string; description: string };
  };
}

export interface Department {
  code: string;
  description: string;
}

export interface Population {
  code: number;
  desc: string;
}

export async function getDepartments(cookie?: string): Promise<Department[]> {
  const url = `${BASE_URL}/CedarInfo/Directory/DepartmentJson`;
  const res = await fetch(url, { headers: makeHeaders(cookie) });
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getPopulations(cookie?: string): Promise<Population[]> {
  const url = `${BASE_URL}/CedarInfo/Directory/PopulationsJson`;
  const res = await fetch(url, { headers: makeHeaders(cookie) });
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getPersonTerms(
  id: string,
  cookie: string,
): Promise<Term[]> {
  const url = `${BASE_URL}/CedarInfo/Json/GetTerms?id=${id}&past=5&future=2&summer=true`;
  const res = await fetch(url, { headers: makeHeaders(cookie) });
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return [];
  try {
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function getPersonInfo(
  id: string,
  term: string,
  cookie: string,
): Promise<PersonInfo | null> {
  const url = `${BASE_URL}/CedarInfo/Info/Json?id=${id}&term=${term}`;
  const res = await fetch(url, { headers: makeHeaders(cookie) });
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null;
  try {
    const data = await res.json();
    return data as PersonInfo;
  } catch {
    return null;
  }
}

export async function searchDirectory(
  firstName: string,
  lastName: string,
  cookie?: string,
  options?: { department?: string; population?: number },
): Promise<DirectoryPerson[]> {
  const params = new URLSearchParams();
  if (firstName) params.set("FirstNameSearch", firstName);
  if (lastName) params.set("LastNameSearch", lastName);
  if (options?.department) params.set("Department", options.department);
  if (options?.population != null)
    params.set("PopulationSearch", String(options.population));

  const apiUrl = `${BASE_URL}/CedarInfo/Directory/SearchResultsJson?${params.toString()}`;
  const response = await fetch(apiUrl, { headers: makeHeaders(cookie) });

  // Unauthenticated: server redirects us to SSO. fetch follows by default,
  // so we end up at a non-selfservice URL.
  const landedOutside = !response.url.includes("selfservice.cedarville.edu");
  if (landedOutside || response.status === 401 || response.status === 403) {
    const signInUrl = landedOutside
      ? response.url
      : `${BASE_URL}/cedarinfo/directory`;
    throw new AuthRequiredError(signInUrl);
  }

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  // Server can also return JSON with a redirect URL instead of an array
  if (!Array.isArray(data)) {
    const signInUrl =
      (data as Record<string, unknown>)?.signInUrl ??
      (data as Record<string, unknown>)?.SignInUrl ??
      (data as Record<string, unknown>)?.redirectUrl;
    if (typeof signInUrl === "string") throw new AuthRequiredError(signInUrl);
    throw new AuthRequiredError(`${BASE_URL}/cedarinfo/directory`);
  }

  return data as DirectoryPerson[];
}
