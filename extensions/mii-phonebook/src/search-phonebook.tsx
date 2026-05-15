import {
  Grid,
  ActionPanel,
  Action,
  Icon,
  Detail,
  LocalStorage,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  environment,
  getPreferenceValues,
  open,
  popToRoot,
} from "@raycast/api";
import { useState, useMemo, useEffect, useCallback } from "react";
import https from "https";
import fs from "fs";
import path from "path";

// Configuration - Update these URLs for your environment
const DENODO_BASE_URL = "https://denodo.mitre.org/server/ecis/active_people/views/ws_active_people";
const PHONEBOOK_URL = "http://info.mitre.org/people/app/person/{id}#Phonebook";
const BADGE_PHOTO_URL = "https://static.mitre.org/people/photos/big/{id}.jpg";
const LIMIT_RESULTS = 100;

// Local directory to cache badge photos for faster rendering
const BADGE_CACHE_DIR = path.join(environment.supportPath, "badge_photos");
const BADGE_CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// Ensure cache directory exists
if (!fs.existsSync(BADGE_CACHE_DIR)) {
  try {
    fs.mkdirSync(BADGE_CACHE_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

// LocalStorage keys for phonebook cache
const CACHE_KEY_DATA = "phonebook_data";
const CACHE_KEY_TIMESTAMP = "phonebook_timestamp";
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// LocalStorage key for recently viewed people
const RECENTLY_VIEWED_KEY = "recently_viewed";

// Type for recently viewed entries (person ID -> timestamp)
type RecentlyViewedMap = Record<string, number>;

// Create an HTTPS agent that allows self-signed certificates (for internal MITRE servers)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

// Job level mapping for display
const LEVEL_MAPPING: Record<string, string> = {
  "Associate (Non-Exempt)": "1",
  Associate: "1",
  CEO: "CEO",
  Distinguished: "8",
  "Intermediate (Non-Exempt)": "2",
  Intermediate: "2",
  "Lead (Non-Exempt)": "4",
  Lead: "4",
  Principal: "5",
  Renowned: "8",
  "Senior (Non-Exempt)": "3",
  "Senior Principal": "6",
  "Senior Vice President": "SVP",
  Senior: "4",
  "Vice President": "VP",
};

// Valid keys to store from API response
const VALID_KEYS = [
  "site_name",
  "email_address",
  "hr_org",
  "hr_org_name",
  "job_title",
  "email_name",
  "mail_stop",
  "phonebook_display_name",
  "mitre_assigned_id",
  "primary_phone_number",
  "mobile_number",
  "job_level",
  "business_title",
  "primary_room_number",
  "continuous_service_date",
] as const;

// Keys to search against
const SEARCH_KEYS = [
  "site_name",
  "email_address",
  "hr_org",
  "hr_org_name",
  "job_title",
  "email_name",
  "mail_stop",
  "phonebook_display_name",
  "mitre_assigned_id",
] as const;

// Type definitions
interface Person {
  site_name?: string;
  email_address?: string;
  hr_org?: string;
  hr_org_name?: string;
  job_title?: string;
  email_name?: string;
  mail_stop?: string;
  phonebook_display_name?: string;
  mitre_assigned_id?: string;
  primary_phone_number?: string;
  mobile_number?: string;
  job_level?: string;
  business_title?: string;
  primary_room_number?: string | null;
  continuous_service_date?: string | null;
  _score?: number;
  // Precomputed, lowercased searchable values for efficiency (not persisted)
  _searchValues?: string[];
}

interface APIResponse {
  elements: Record<string, unknown>[];
}

interface Preferences {
  resetOnTeamsAction: boolean;
}

// Build the full API URL with selected fields
function buildApiUrl(): string {
  const selectFields = VALID_KEYS.join(",");
  const filter = encodeURIComponent("(email_address is not null and job_level is not null)");
  return `${DENODO_BASE_URL}?$select=${selectFields}&$filter=${filter}&$format=json`;
}

// Fetch people data from the API using native https
function fetchPeopleData(): Promise<Person[]> {
  const url = buildApiUrl();

  return new Promise((resolve, reject) => {
    const request = https.get(url, { agent: httpsAgent, timeout: 30000 }, (response) => {
      if (response.statusCode !== 200) {
        reject(
          new Error(
            `Failed to fetch phonebook data (HTTP ${response.statusCode}). Make sure you're on the MITRE network.`
          )
        );
        return;
      }

      const chunks: Uint8Array[] = [];
      response.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      response.on("end", () => {
        try {
          const data = Buffer.concat(chunks).toString("utf-8");
          const result = JSON.parse(data) as APIResponse;

          // Extract only the valid keys from each person
          const people = result.elements.map((person) => {
            const filtered: Person = {};
            for (const key of VALID_KEYS) {
              if (key in person) {
                (filtered as Record<string, unknown>)[key] = person[key];
              }
            }
            return filtered;
          });
          resolve(people);
        } catch (err) {
          reject(new Error("Failed to parse phonebook data"));
        }
      });
      response.on("error", (err) => reject(err));
    });

    request.on("error", (err) => reject(err));
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("Request timed out. Make sure you're on the MITRE network."));
    });
  });
}

// Precompute lowercased searchable values for each person (not persisted)
function enrichSearchValues(data: Person[]): Person[] {
  return data.map((p) => ({
    ...p,
    _searchValues: SEARCH_KEYS.map((key) => String((p as Record<string, unknown>)[key] ?? "").toLowerCase()),
  }));
}

// Search through people data efficiently by using precomputed, lowercased values
function searchPeople(data: Person[], searchText: string): Person[] {
  if (!searchText.trim()) {
    return [];
  }

  const terms = searchText.toLowerCase().split(/\s+/).filter(Boolean);
  const results: Person[] = [];

  for (const person of data) {
    const fields =
      person._searchValues ??
      SEARCH_KEYS.map((key) => String((person as Record<string, unknown>)[key] ?? "").toLowerCase());
    const found: Record<string, number> = Object.fromEntries(terms.map((t) => [t, 0]));

    for (const field of fields) {
      for (const term of terms) {
        if (field.includes(term)) {
          found[term] += 1;
        }
      }
    }

    // Check if all terms were found
    const allTermsFound = Object.values(found).every((count) => count > 0);

    if (allTermsFound) {
      results.push({
        ...person,
        _score: Object.values(found).reduce((a, b) => a + b, 0),
      });

      if (results.length >= LIMIT_RESULTS) {
        break;
      }
    }
  }

  // Sort by score (highest first)
  return results.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
}

// Format business title (reverse the order of comma-separated parts)
function formatBusinessTitle(title: string | undefined): string {
  if (!title) return "";
  const parts = title.split(",").slice(-2).reverse();
  return parts.join(" ").trim();
}

// Get badge photo URL for an employee ID
function getBadgePhotoUrl(employeeId: string | undefined): string | undefined {
  if (!employeeId) return undefined;
  return BADGE_PHOTO_URL.replace("{id}", employeeId);
}

// Local badge photo caching utilities
function getBadgePhotoCachePath(employeeId: string): string {
  const fileName = `${employeeId}.jpg`;
  return path.join(BADGE_CACHE_DIR, fileName);
}

function getCachedBadgePhotoPath(employeeId: string | undefined): string | undefined {
  if (!employeeId) return undefined;
  const p = getBadgePhotoCachePath(employeeId);
  if (fs.existsSync(p)) {
    try {
      const stats = fs.statSync(p);
      const age = Date.now() - stats.mtimeMs;
      if (age < BADGE_CACHE_TTL_MS) {
        return p;
      }
    } catch {
      // ignore
    }
  }
  return undefined;
}

async function downloadBadgePhoto(employeeId: string): Promise<string | undefined> {
  const cachePath = getBadgePhotoCachePath(employeeId);
  const url = getBadgePhotoUrl(employeeId);
  if (!url) return undefined;

  // If cached but fresh, return immediately
  if (fs.existsSync(cachePath)) {
    try {
      const stats = fs.statSync(cachePath);
      const age = Date.now() - stats.mtimeMs;
      if (age < BADGE_CACHE_TTL_MS) {
        return cachePath;
      }
    } catch {
      // fall through to re-download
    }
  }

  return new Promise((resolve) => {
    const req = https.get(url, { agent: httpsAgent, timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        resolve(undefined);
        return;
      }
      const chunks: Uint8Array[] = [];
      res.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const buf = Buffer.concat(chunks);
          if (buf.length > 100) {
            fs.writeFileSync(cachePath, new Uint8Array(buf));
            resolve(cachePath);
          } else {
            resolve(undefined);
          }
        } catch {
          resolve(undefined);
        }
      });
      res.on("error", () => resolve(undefined));
    });
    req.on("error", () => resolve(undefined));
    req.on("timeout", () => {
      req.destroy();
      resolve(undefined);
    });
  });
}

// Get phonebook URL for an employee
function getPhonebookUrl(employeeId: string | undefined): string {
  if (!employeeId) return "";
  return PHONEBOOK_URL.replace("{id}", employeeId);
}

// Get level display string
function getLevelDisplay(jobLevel: string | undefined): string {
  if (!jobLevel) return "";
  return LEVEL_MAPPING[jobLevel] ?? jobLevel;
}

// Format relative time (e.g., "2h ago", "yesterday")
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

// Format total time in years based on effective hire date
function formatYearsAtMitre(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  const hireDate = new Date(dateString);
  if (isNaN(hireDate.getTime())) return null;

  const now = new Date();
  const diffTime = now.getTime() - hireDate.getTime();
  if (diffTime < 0) return null; // Future hire date

  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return `${diffYears.toFixed(1)} years`;
}

// Clear all cached data
async function clearAllCache(): Promise<void> {
  const confirmed = await confirmAlert({
    title: "Clear Phonebook Cache",
    message:
      "This will delete all cached phonebook data. The next time you open the extension, data will be fetched fresh from the server.",
    primaryAction: {
      title: "Clear Cache",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) {
    return;
  }

  try {
    await LocalStorage.removeItem(CACHE_KEY_DATA);
    await LocalStorage.removeItem(CACHE_KEY_TIMESTAMP);

    await showToast({
      style: Toast.Style.Success,
      title: "Cache cleared",
      message: "Phonebook data will be refreshed on next load",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to clear cache",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Record when a person was viewed
async function recordPersonView(personId: string): Promise<void> {
  try {
    const existing = await LocalStorage.getItem<string>(RECENTLY_VIEWED_KEY);
    const recentlyViewed: RecentlyViewedMap = existing ? JSON.parse(existing) : {};
    recentlyViewed[personId] = Date.now();
    await LocalStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentlyViewed));
  } catch {
    // Silently fail - this is a non-critical feature
  }
}

// Get recently viewed people map
async function getRecentlyViewed(): Promise<RecentlyViewedMap> {
  try {
    const data = await LocalStorage.getItem<string>(RECENTLY_VIEWED_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// Main command component
export default function SearchPhonebook() {
  const [searchText, setSearchText] = useState("");
  const [peopleData, setPeopleData] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedMap>({});

  // Load recently viewed data
  const loadRecentlyViewed = useCallback(async () => {
    const data = await getRecentlyViewed();
    setRecentlyViewed(data);
  }, []);

  // Load data from cache immediately, then revalidate in background if stale or forced
  const loadData = useCallback(async (forceRefresh = false) => {
    setError(null);

    let usedCache = false;
    let cachedTimestamp: number | null = null;

    // Try to hydrate from cache immediately for better perceived performance
    try {
      const cachedDataStr = await LocalStorage.getItem<string>(CACHE_KEY_DATA);
      const cachedTsStr = await LocalStorage.getItem<string>(CACHE_KEY_TIMESTAMP);
      if (cachedDataStr) {
        const parsed = JSON.parse(cachedDataStr) as Person[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const enriched = enrichSearchValues(parsed);
          setPeopleData(enriched);
          if (cachedTsStr) {
            cachedTimestamp = parseInt(cachedTsStr, 10);
            setLastUpdated(cachedTimestamp);
          }
          usedCache = true;
          setIsLoading(false);
        }
      }
    } catch (cacheErr) {
      // Cache is corrupted - clear it and continue
      console.error("Cache read error, clearing cache:", cacheErr);
      try {
        await LocalStorage.removeItem(CACHE_KEY_DATA);
        await LocalStorage.removeItem(CACHE_KEY_TIMESTAMP);
      } catch {
        // Ignore cache clear errors
      }
    }

    // Decide whether to revalidate (force or expired/missing)
    const age = cachedTimestamp != null ? Date.now() - cachedTimestamp : Number.POSITIVE_INFINITY;
    const shouldRevalidate = forceRefresh || age >= CACHE_MAX_AGE || !usedCache;

    if (!shouldRevalidate) {
      // Fresh cache already used; nothing else to do
      return;
    }

    // Fetch fresh data (foreground if forced, background otherwise)
    if (forceRefresh || !usedCache) {
      setIsLoading(true);
    }

    try {
      const data = await fetchPeopleData();
      const now = Date.now();
      const enriched = enrichSearchValues(data);
      setPeopleData(enriched);
      setLastUpdated(now);

      // Save to cache (persist only the minimal person payload)
      try {
        await LocalStorage.setItem(CACHE_KEY_DATA, JSON.stringify(data));
        await LocalStorage.setItem(CACHE_KEY_TIMESTAMP, now.toString());
      } catch (cacheWriteErr) {
        // Cache write failed (possibly too large) - continue without caching
        console.error("Cache write error:", cacheWriteErr);
      }

      if (forceRefresh && usedCache) {
        await showToast({
          style: Toast.Style.Success,
          title: "Phonebook updated",
          message: "Data refreshed",
        });
      }
    } catch (fetchErr) {
      const errorMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error("Fetch error:", errorMessage);

      if (!usedCache) {
        // No cache to fall back to; surface error
        setError(fetchErr instanceof Error ? fetchErr : new Error("Unknown error"));
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load phonebook",
          message: errorMessage.substring(0, 100),
        });
      } else {
        // Using stale cache already; inform user optionally on manual refresh
        if (forceRefresh) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Using cached data",
            message: `Fetch failed: ${errorMessage.substring(0, 100)}`,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh function for manual refresh
  const revalidate = useCallback(() => {
    loadData(true);
  }, [loadData]);

  // Load data on mount
  useEffect(() => {
    loadData();
    loadRecentlyViewed();
  }, [loadData, loadRecentlyViewed]);

  // Filter results based on search text, sorted by recently viewed first
  const searchResults = useMemo(() => {
    if (!peopleData || peopleData.length === 0 || !searchText.trim()) {
      return [];
    }
    const results = searchPeople(peopleData, searchText);

    // Sort: recently viewed people first (by most recent), then others by score
    return results.sort((a, b) => {
      const aId = a.mitre_assigned_id ?? "";
      const bId = b.mitre_assigned_id ?? "";
      const aViewed = recentlyViewed[aId] ?? 0;
      const bViewed = recentlyViewed[bId] ?? 0;

      // If both were viewed, sort by most recent
      if (aViewed > 0 && bViewed > 0) {
        return bViewed - aViewed;
      }
      // If only one was viewed, it comes first
      if (aViewed > 0) return -1;
      if (bViewed > 0) return 1;
      // Neither viewed: sort by search score
      return (b._score ?? 0) - (a._score ?? 0);
    });
  }, [peopleData, searchText, recentlyViewed]);

  // Determine what to show
  const hasData = peopleData && peopleData.length > 0;
  const hasSearchText = searchText.trim() !== "";
  const hasResults = searchResults.length > 0;

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      fit={Grid.Fit.Fill}
      aspectRatio="3/4"
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name, email, department, or employee ID..."
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Refresh Phonebook Data"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
          <Action
            title="Clear All Cache"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={clearAllCache}
          />
        </ActionPanel>
      }
    >
      {error ? (
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to Load Phonebook"
          description="Make sure you're connected to the MITRE network. Press Enter to retry."
        />
      ) : !hasData && !isLoading ? (
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="No Phonebook Data"
          description="Could not load phonebook data. Make sure you're on the MITRE network."
        />
      ) : !hasSearchText ? (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search the Phonebook"
          description={
            hasData
              ? `${peopleData.length.toLocaleString()} employees loaded${lastUpdated ? ` (updated ${formatRelativeTime(lastUpdated)})` : ""}. Type to search.`
              : "Loading phonebook data..."
          }
        />
      ) : !hasResults && !isLoading ? (
        <Grid.EmptyView
          icon={Icon.Person}
          title="No Results Found"
          description={`No employees found matching "${searchText}"`}
        />
      ) : (
        searchResults.map((person) => (
          <PersonGridItem
            key={person.mitre_assigned_id ?? person.email_address}
            person={person}
            onRefresh={revalidate}
            onViewed={loadRecentlyViewed}
          />
        ))
      )}
    </Grid>
  );
}

// Grid item component for each person (with local badge photo caching)
function PersonGridItem({
  person,
  onRefresh,
  onViewed,
}: {
  person: Person;
  onRefresh: () => void;
  onViewed: () => void;
}) {
  const phonebookUrl = getPhonebookUrl(person.mitre_assigned_id);
  const remoteBadgeUrl = getBadgePhotoUrl(person.mitre_assigned_id);
  const [contentImage, setContentImage] = useState<string | Icon>(remoteBadgeUrl ?? Icon.Person);

  useEffect(() => {
    let cancelled = false;
    const id = person.mitre_assigned_id;
    if (!id) {
      setContentImage(remoteBadgeUrl ?? Icon.Person);
      return;
    }

    // Prefer cached local image if fresh; otherwise fetch in background
    const cached = getCachedBadgePhotoPath(id);
    if (cached) {
      setContentImage(cached);
    } else {
      // Show remote while caching in background
      setContentImage(remoteBadgeUrl ?? Icon.Person);
      downloadBadgePhoto(id)
        .then((p) => {
          if (!cancelled && p) {
            setContentImage(p);
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [person.mitre_assigned_id]);

  return (
    <Grid.Item
      content={contentImage}
      title={person.phonebook_display_name ?? "Unknown"}
      subtitle={person.hr_org ?? ""}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Primary Actions">
            <Action.Push
              title="View Details"
              icon={Icon.Sidebar}
              target={<PersonDetailView person={person} onViewed={onViewed} />}
            />
            <Action.OpenInBrowser title="Open in Phonebook" url={phonebookUrl} icon={Icon.Globe} />
            {person.email_address && (
              <Action.CopyToClipboard
                title="Copy Email Address"
                content={person.email_address}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Contact Info">
            {person.primary_phone_number && (
              <Action.CopyToClipboard
                title="Copy Phone Number"
                content={person.primary_phone_number}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            )}
            {person.mobile_number && (
              <Action.CopyToClipboard
                title="Copy Mobile Number"
                content={person.mobile_number}
                shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
              />
            )}
            {person.mitre_assigned_id && (
              <Action.CopyToClipboard
                title="Copy Employee Number"
                content={person.mitre_assigned_id}
                shortcut={{ modifiers: ["ctrl"], key: "e" }}
              />
            )}
          </ActionPanel.Section>

          {person.email_address && (
            <ActionPanel.Section title="Microsoft Teams">
              <Action
                title="Chat in Teams"
                icon={Icon.Message}
                onAction={async () => {
                  await open(`msteams:/l/chat/0/0?users=${person.email_address}`);
                  if (getPreferenceValues<Preferences>().resetOnTeamsAction) {
                    await popToRoot({ clearSearchBar: true });
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Call in Teams"
                icon={Icon.Phone}
                onAction={async () => {
                  await open(`msteams:/l/call/0/0?users=${person.email_address}`);
                  if (getPreferenceValues<Preferences>().resetOnTeamsAction) {
                    await popToRoot({ clearSearchBar: true });
                  }
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <Action
              title="Refresh Phonebook Data"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
            <Action
              title="Clear All Cache"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={clearAllCache}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Detail view component
function PersonDetailView({ person, onViewed }: { person: Person; onViewed?: () => void }) {
  const phonebookUrl = getPhonebookUrl(person.mitre_assigned_id);
  const levelDisplay = getLevelDisplay(person.job_level);
  const formattedTitle = formatBusinessTitle(person.business_title);
  const yearsAtMitre = formatYearsAtMitre(person.continuous_service_date);

  // Record this view when component mounts
  useEffect(() => {
    if (person.mitre_assigned_id) {
      recordPersonView(person.mitre_assigned_id).then(() => {
        onViewed?.();
      });
    }
  }, [person.mitre_assigned_id, onViewed]);

  // Build phone rows conditionally
  let phoneRows = "";
  const mobile = person.mobile_number;
  const work = person.primary_phone_number;

  if (mobile && work) {
    if (mobile === work) {
      // Same number - show only as Mobile
      phoneRows = `| **Mobile** | ${mobile} |`;
    } else {
      // Different numbers - show both
      phoneRows = `| **Mobile** | ${mobile} |\n| **Office** | ${work} |`;
    }
  } else if (mobile) {
    // Only mobile exists
    phoneRows = `| **Mobile** | ${mobile} |`;
  } else if (work) {
    // Only work exists
    phoneRows = `| **Office** | ${work} |`;
  }

  const teamsChat = person.email_address ? `msteams:/l/chat/0/0?users=${person.email_address}` : "";
  const teamsCall = person.email_address ? `msteams:/l/call/0/0?users=${person.email_address}` : "";
  const miiCliUrl = person.mitre_assigned_id
    ? `https://miicli.mitre.org/employee/${person.mitre_assigned_id}`
    : "";

  // Build photo display
  const badgePhotoUrl = getBadgePhotoUrl(person.mitre_assigned_id);

  const markdown = `
${badgePhotoUrl ? `![Photo](${badgePhotoUrl})` : ""}

| **${person.phonebook_display_name ?? "Unknown"}** | ${formattedTitle || ""} |
| ---: | :--- |
| **Email** | ${person.email_address ?? "N/A"} |
${phoneRows}
${person.email_address ? `| **Teams** | [Chat](${teamsChat}) · [Call](${teamsCall}) |` : ""}
${person.mitre_assigned_id ? `| **MII CLI** | [Stats](${miiCliUrl}) |` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={person.phonebook_display_name ?? "Employee Details"}
      metadata={
        <Detail.Metadata>
          {levelDisplay && <Detail.Metadata.Label title="Level" text={levelDisplay} />}
          {yearsAtMitre && <Detail.Metadata.Label title="Time at MITRE" text={yearsAtMitre} />}
          <Detail.Metadata.Label
            title="Department"
            text={`${person.hr_org ?? ""} - ${person.hr_org_name ?? ""}`}
          />
          <Detail.Metadata.Label title="Site" text={person.site_name ?? "N/A"} />
          {person.primary_room_number && (
            <Detail.Metadata.Label title="Room" text={person.primary_room_number} />
          )}
          <Detail.Metadata.Label title="Mailstop" text={person.mail_stop ?? "N/A"} />
          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Employee ID" text={person.mitre_assigned_id ?? "N/A"} />
          <Detail.Metadata.Link title="Phonebook" target={phonebookUrl} text="Open in Browser" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Primary Actions">
            <Action.OpenInBrowser title="Open in Phonebook" url={phonebookUrl} icon={Icon.Globe} />
            {person.email_address && (
              <Action.CopyToClipboard
                title="Copy Email Address"
                content={person.email_address}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Contact Info">
            {person.primary_phone_number && (
              <Action.CopyToClipboard
                title="Copy Phone Number"
                content={person.primary_phone_number}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            )}
            {person.mitre_assigned_id && (
              <Action.CopyToClipboard
                title="Copy Employee Number"
                content={person.mitre_assigned_id}
                shortcut={{ modifiers: ["ctrl"], key: "e" }}
              />
            )}
          </ActionPanel.Section>

          {person.email_address && (
            <ActionPanel.Section title="Microsoft Teams">
              <Action
                title="Chat in Teams"
                icon={Icon.Message}
                onAction={async () => {
                  await open(`msteams:/l/chat/0/0?users=${person.email_address}`);
                  if (getPreferenceValues<Preferences>().resetOnTeamsAction) {
                    await popToRoot({ clearSearchBar: true });
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              />
              <Action
                title="Call in Teams"
                icon={Icon.Phone}
                onAction={async () => {
                  await open(`msteams:/l/call/0/0?users=${person.email_address}`);
                  if (getPreferenceValues<Preferences>().resetOnTeamsAction) {
                    await popToRoot({ clearSearchBar: true });
                  }
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
