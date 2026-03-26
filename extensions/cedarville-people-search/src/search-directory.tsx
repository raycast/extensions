import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Image,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { readFile } from "fs/promises";
import { useEffect, useRef, useState } from "react";
import {
  AuthRequiredError,
  type Department,
  type DirectoryPerson,
  type PersonInfo,
  type Population,
  type ScheduleItem,
  getDepartments,
  getPersonInfo,
  getPersonTerms,
  getPopulations,
  searchDirectory,
} from "./api";
import {
  clearCookie,
  drainPendingCookie,
  getStoredCookie,
  launchAuthBrowser,
  storeCookie,
} from "./auth";
import { getCacheSize, mergePeopleIntoCache, searchCache } from "./cache";
import { getCachedPhotoPath } from "./images";


type AuthState =
  | { kind: "loading" }
  | { kind: "ready"; cookie: string }
  | { kind: "sign-in" }
  | { kind: "signing-in" };

const CLASS_LABELS: Record<string, string> = {
  FR: "Freshman",
  SO: "Sophomore",
  JR: "Junior",
  SR: "Senior",
  GR: "Graduate",
  GS: "Graduate Student",
  HS: "High School",
  P1: "Pharmacy Year 1",
  P2: "Pharmacy Year 2",
  P3: "Pharmacy Year 3",
  P4: "Pharmacy Year 4",
};

const TYPE_LABELS: Record<string, string> = {
  UG: "Undergraduate",
  GR: "Graduate",
  GS: "Graduate Student",
  DE: "Dual Enrollment",
  P1: "Pharmacy Year 1",
  P2: "Pharmacy Year 2",
  P3: "Pharmacy Year 3",
  P4: "Pharmacy Year 4",
};

function displayName(person: DirectoryPerson, showLegal = false): string {
  const nickname =
    person.Nickname && person.Nickname !== person.FirstName
      ? person.Nickname
      : null;
  const first =
    showLegal && nickname
      ? `${nickname} (${person.FirstName})`
      : (nickname ?? person.FirstName);
  const middle = person.MiddleName ? ` ${person.MiddleName}` : "";
  return `${first}${middle} ${person.LastName}`;
}

function email(username: string): string {
  return `${username}@cedarville.edu`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 4) return `ext. ${digits}`;
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1")
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return phone.trim();
}

const FACULTY_TITLE_KEYWORDS = /professor|instructor|lecturer|faculty/i;

function isFacultyHeuristic(person: DirectoryPerson): boolean {
	if (person.isFaculty !== undefined) return person.isFaculty;
	return !!person.Title && FACULTY_TITLE_KEYWORDS.test(person.Title);
}

const DEMO_NAMES_STUDENT = ["Alex Johnson", "Jordan Smith", "Taylor Williams"];
const DEMO_NAMES_STAFF   = ["Dr. Chris Brown", "Pat Miller", "Sam Davis"];

function demoName(person: DirectoryPerson): string {
  const isStaffPerson = !person.StudentType || !!(person.Title?.trim() && person.OfficeBuildingCode);
  const pool = isStaffPerson ? DEMO_NAMES_STAFF : DEMO_NAMES_STUDENT;
  return pool[parseInt(person.Id.slice(-2), 10) % pool.length];
}

function parseSearchQuery(query: string): {
  firstName: string;
  lastName: string;
} {
  const parts = query.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts.pop() ?? "";
  return { firstName: parts.join(" "), lastName };
}

// ─── Person detail view ────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR: Record<string, string> = {
  Monday: "M", Tuesday: "T", Wednesday: "W", Thursday: "Th",
  Friday: "F", Saturday: "Sa", Sunday: "Su",
};
const TYPE_LABEL: Record<string, string> = {
  Lecture: "",
  Laboratory: "Lab",
  "Instructional Laboratory": "Lab",
  "Participation Course": "Participation",
};

function buildScheduleText(items: ScheduleItem[], demo: boolean): string {
  // Collapse repeated per-day entries into one slot per unique time+type
  const slotMap = new Map<string, { item: ScheduleItem; days: string[] }>();
  for (const item of items) {
    const key = `${item.title}|${item.startTime}|${item.endTime}|${item.type}`;
    if (!slotMap.has(key)) slotMap.set(key, { item, days: [] });
    slotMap.get(key)!.days.push(item.day);
  }

  // Group slots by course title so lecture + lab appear under one heading
  const courseMap = new Map<string, { item: ScheduleItem; days: string[] }[]>();
  for (const slot of slotMap.values()) {
    if (!courseMap.has(slot.item.title)) courseMap.set(slot.item.title, []);
    courseMap.get(slot.item.title)!.push(slot);
  }

  // Sort courses by earliest day of week
  const courses = [...courseMap.entries()].sort((a, b) => {
    const earliest = (slots: { days: string[] }[]) =>
      Math.min(...slots.flatMap((s) => s.days.map((d) => DAY_ORDER.indexOf(d))));
    return earliest(a[1]) - earliest(b[1]);
  });

  return courses
    .map(([courseTitle, slots]) => {
      const course = demo ? "DEPT 000" : courseTitle;
      const desc = demo ? "Course Name" : slots[0].item.description;

      const sortedSlots = [...slots].sort((a, b) => {
        const aFirst = Math.min(...a.days.map((d) => DAY_ORDER.indexOf(d)));
        const bFirst = Math.min(...b.days.map((d) => DAY_ORDER.indexOf(d)));
        return aFirst - bFirst || a.item.startTime.localeCompare(b.item.startTime);
      });

      const timeLines = sortedSlots.map(({ item, days }) => {
        const sortedDays = [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
        const dayStr = sortedDays.map((d) => DAY_ABBR[d] ?? d).join("");
        const timeStr = `${formatTime(item.startTime)}–${formatTime(item.endTime)}`;
        const typeStr = TYPE_LABEL[item.type] ?? item.type;
        return `- ${dayStr} ${timeStr}${typeStr ? ` *(${typeStr})*` : ""}`;
      });

      return `**${course}** — ${desc}\n${timeLines.join("\n")}`;
    })
    .join("\n\n");
}

function PersonDetail({
  person,
  photoPath,
  cookie,
  onSignOut,
  demo,
}: {
  person: DirectoryPerson;
  photoPath: string | null;
  cookie: string;
  onSignOut: () => void;
  demo: boolean;
}) {
  const name = demo ? demoName(person) : displayName(person, true);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<PersonInfo | null>(null);

  useEffect(() => {
    if (!photoPath) return;
    readFile(photoPath)
      .then((buf) =>
        setPhotoDataUrl(`data:image/jpeg;base64,${buf.toString("base64")}`),
      )
      .catch(() => {});
  }, [photoPath]);

  useEffect(() => {
    (async () => {
      const terms = await getPersonTerms(person.Id, cookie);
      if (!terms.length) return;
      const now = Date.now();
      const current =
        terms.find((t) => {
          const start = t.start ? new Date(t.start).getTime() : 0;
          const end = t.end ? new Date(t.end).getTime() : Infinity;
          return now >= start && now <= end;
        }) ?? terms[0];
      const result = await getPersonInfo(person.Id, current.code, cookie);
      if (result) {
        setInfo(result);
        // Write confirmed isFaculty back to cache
        const confirmed = result.faculty.isFaculty;
        if (person.isFaculty !== confirmed) {
          await mergePeopleIntoCache([{ ...person, isFaculty: confirmed }]);
        }
      }
    })();
  }, [person.Id, cookie]);

  // Photo full-width at top, name + italic tags below
  const md: string[] = [];
  if (!demo && photoDataUrl) md.push(`![Photo](${photoDataUrl})`);
  md.push(`# ${name}`);
  const isStaff = !person.StudentType || !!(person.Title?.trim() && person.OfficeBuildingCode);
  const tags: string[] = [];
  if (isStaff) {
    tags.push(isFacultyHeuristic(person) ? "Faculty" : "Staff");
  } else if (person.StudentType === "DE") {
    tags.push("Dual Enrollment");
  } else {
    if (
      person.StudentClass &&
      CLASS_LABELS[person.StudentClass] &&
      person.StudentClass !== "GS" &&
      person.StudentClass !== "HS" &&
      person.StudentType !== null
    )
      tags.push(CLASS_LABELS[person.StudentClass]);
    if (person.StudentType)
      tags.push(TYPE_LABELS[person.StudentType] ?? person.StudentType);
  }
  if (person.studentWorker) tags.push("Student Worker");
  if (person.Title?.trim()) tags.push(person.Title.trim());
  if (tags.length) md.push(`*${tags.join(" · ")}*`);

  const scheduleItems = info?.faculty?.isFaculty
    ? info.faculty.scheduleItems
    : info?.student?.isStudent
      ? info.student.scheduleItems
      : [];
  const termDesc = info?.faculty?.isFaculty
    ? info.faculty.term?.description
    : info?.student?.term?.description;

  const nonScheduled = info?.student?.isStudent ? (info.student.nonScheduledCourses ?? []) : [];

  if (scheduleItems.length || nonScheduled.length) {
    md.push(`## Schedule${termDesc ? ` — ${termDesc}` : ""}\n`);
    if (scheduleItems.length) md.push(buildScheduleText(scheduleItems, demo));
    if (nonScheduled.length) {
      md.push("**Online / Unscheduled**");
      md.push(
        nonScheduled
          .map((c) => `- ${demo ? "DEPT 000" : c.code} — ${demo ? "Course Name" : c.title} *(${c.methods})*`)
          .join("\n"),
      );
    }
  }

  return (
    <Detail
      isLoading={!info}
      markdown={md.join("\n\n")}
      navigationTitle={name}
      metadata={
        <Detail.Metadata>
          {person.Username && (
            <Detail.Metadata.Label
              title="Email"
              text={demo ? "username@cedarville.edu" : email(person.Username)}
            />
          )}
          {person.DepartmentDescription && (
            <Detail.Metadata.Label
              title="Department"
              text={person.DepartmentDescription}
            />
          )}
          {!!(isStaff ||
            person.StudentClass ||
            person.studentWorker) && <Detail.Metadata.Separator />}
          {isStaff ? (
            <Detail.Metadata.TagList title="Role">
              <Detail.Metadata.TagList.Item
                text={isFacultyHeuristic(person) ? "Faculty" : "Staff"}
                color={isFacultyHeuristic(person) ? Color.Orange : Color.Green}
              />
            </Detail.Metadata.TagList>
          ) : person.StudentType === "DE" ? (
            <Detail.Metadata.TagList title="Program">
              <Detail.Metadata.TagList.Item
                text="Dual Enrollment"
                color={Color.Orange}
              />
            </Detail.Metadata.TagList>
          ) : (
            <>
              {person.StudentClass &&
                CLASS_LABELS[person.StudentClass] &&
                person.StudentClass !== "GS" &&
                person.StudentClass !== "HS" &&
                person.StudentType !== null && (
                  <Detail.Metadata.TagList title="Year">
                    <Detail.Metadata.TagList.Item
                      text={CLASS_LABELS[person.StudentClass]}
                      color={Color.Blue}
                    />
                  </Detail.Metadata.TagList>
                )}
              {person.StudentType && (
                <Detail.Metadata.Label
                  title="Program"
                  text={TYPE_LABELS[person.StudentType] ?? person.StudentType}
                />
              )}
            </>
          )}
          {person.studentWorker && (
            <Detail.Metadata.TagList title="Role">
              <Detail.Metadata.TagList.Item
                text="Student Worker"
                color={Color.Yellow}
              />
            </Detail.Metadata.TagList>
          )}
          {!!(person.DormName ||
            person.OfficeBuildingName ||
            person.OfficePhone ||
            info?.person?.box) && <Detail.Metadata.Separator />}
          {person.DormName && (
            <Detail.Metadata.Label
              title="Dorm"
              text={
                demo
                  ? "Residence Hall, Room 000"
                  : person.DormRoom
                    ? `${person.DormName}, Room ${person.DormRoom}`
                    : person.DormName
              }
            />
          )}
          {info?.person?.box && (
            <Detail.Metadata.Label
              title="Box"
              text={demo ? "#0000" : `#${info.person.box}`}
            />
          )}
          {person.OfficeBuildingCode && (
            <Detail.Metadata.Label
              title="Office"
              text={
                person.OfficeRoom
                  ? `${person.OfficeBuildingCode} ${person.OfficeRoom}`
                  : person.OfficeBuildingCode
              }
            />
          )}
          {person.OfficePhone && (
            <Detail.Metadata.Label
              title="Phone"
              text={demo ? "ext. ****" : formatPhone(person.OfficePhone)}
            />
          )}
          {!!(person.AddressCity || person.AddressState || info?.address?.addresslines?.length) && (
            <Detail.Metadata.Separator />
          )}
          {!!(person.AddressCity || person.AddressState) && (
            <Detail.Metadata.Label
              title="Hometown"
              text={demo ? "City, OH" : [person.AddressCity, person.AddressState].filter(Boolean).join(", ")}
            />
          )}
          {info?.address?.addresslines?.filter(Boolean).length ? (
            <Detail.Metadata.Label
              title="Address"
              text={demo ? "123 Example St, City, OH 00000" : info.address.addresslines.filter(Boolean).join(", ")}
            />
          ) : null}
          {info?.student?.isStudent && (() => {
            const majors = info.student.majors.filter(m => m.desc?.trim());
            const minors = info.student.minors.filter(m => m.desc?.trim());
            const concentrations = info.student.concentrations.filter(c => c.desc?.trim());
            const advisors = info.student.advisors.filter(a => a.advisor.name?.trim());
            if (!majors.length && !minors.length && !concentrations.length && !advisors.length) return null;
            return (
              <>
                <Detail.Metadata.Separator />
                {majors.map((m) => (
                  <Detail.Metadata.Label key={m.code} title="Major" text={m.desc} />
                ))}
                {minors.map((m) => (
                  <Detail.Metadata.Label key={m.code} title="Minor" text={m.desc} />
                ))}
                {concentrations.map((c) => (
                  <Detail.Metadata.Label key={c.code} title="Concentration" text={c.desc} />
                ))}
                {advisors.map((a) => (
                  <Detail.Metadata.Label key={a.advisor.id} title="Advisor" text={demo ? "Advisor Name" : a.advisor.name} />
                ))}
              </>
            );
          })()}
          {info?.faculty?.isFaculty && info.faculty.facultyDepts.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {info.faculty.facultyDepts.map((d) => (
                <Detail.Metadata.Label
                  key={d.code}
                  title="Faculty Dept"
                  text={d.description}
                />
              ))}
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="ID" text={demo ? "000000000" : person.Id} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {person.Username && (
            <Action.CopyToClipboard
              title="Copy Email"
              content={demo ? "username@cedarville.edu" : email(person.Username)}
            />
          )}
          {!demo && person.Username && (
            <Action.OpenInBrowser
              title="Send Email"
              url={`mailto:${email(person.Username)}`}
              icon={Icon.Envelope}
            />
          )}
          {person.OfficePhone && (
            <Action.CopyToClipboard
              title="Copy Phone"
              content={demo ? "ext. ****" : formatPhone(person.OfficePhone)}
            />
          )}
          <Action.CopyToClipboard
            title="Copy ID"
            content={demo ? "000000000" : person.Id}
            icon={Icon.Person}
          />
          {!demo && (
            <Action.OpenInBrowser
              title="Open Info Page"
              url={`https://selfservice.cedarville.edu/Cedarinfo/Info?id=${person.Id}`}
              icon={Icon.Globe}
            />
          )}
          {!demo && (
            <Action.CopyToClipboard
              title="Export as JSON"
              icon={Icon.Code}
              content={JSON.stringify(person, null, 2)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
            />
          )}
          <Action
            title="Sign Out"
            icon={Icon.ArrowLeft}
            onAction={onSignOut}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ─── Person list item ──────────────────────────────────────────────────────

function PersonListItem({
  person,
  photoPath,
  cookie,
  onSignOut,
  demo,
}: {
  person: DirectoryPerson;
  photoPath: string | null;
  cookie: string;
  onSignOut: () => void;
  demo: boolean;
}) {
  const name = demo ? demoName(person) : displayName(person);

  // Subtitle: title for staff, dorm for students
  const isStudent =
    !!person.StudentClass &&
    !!person.StudentType &&
    !(person.Title?.trim() && person.OfficeBuildingCode);
  const hasOffice = !isStudent && !!person.OfficeBuildingCode;
  const rawTitle = demo
    ? undefined
    : isStudent
      ? person.DormName
        ? `${person.DormName}${person.DormRoom ? ` ${person.DormRoom}` : ""}`
        : person.Username
          ? email(person.Username)
          : undefined
      : ((person.Title?.trim() ||
          (person.Username ? email(person.Username) : undefined)) ??
        undefined);
  const subtitle =
    hasOffice && rawTitle && rawTitle.length > 30
      ? `${rawTitle.slice(0, 29)}…`
      : rawTitle;

  // Badge
  let badge: List.Item.Accessory | null = null;
  if (!isStudent) {
    const faculty = isFacultyHeuristic(person);
    badge = { tag: { value: faculty ? "Faculty" : "Staff", color: faculty ? Color.Orange : Color.Green } };
  } else if (person.StudentType === "DE") {
    badge = { tag: { value: "DE", color: Color.Orange } };
  } else if (person.StudentType === "GS" || person.StudentClass === "GS") {
    badge = { tag: { value: "Graduate", color: Color.Purple } };
  } else if (
    person.StudentClass &&
    CLASS_LABELS[person.StudentClass] &&
    person.StudentClass !== "HS" &&
    person.StudentType !== null
  ) {
    badge = {
      tag: { value: CLASS_LABELS[person.StudentClass], color: Color.Blue },
    };
  }

  // Accessories: office then badge
  const accessories: List.Item.Accessory[] = [];
  if (hasOffice) {
    const officeLabel = person.OfficeRoom
      ? `${person.OfficeBuildingCode} ${person.OfficeRoom}`
      : person.OfficeBuildingCode!;
    accessories.push({ text: officeLabel, icon: Icon.Building });
  }
  if (badge) accessories.push(badge);

  return (
    <List.Item
      title={name}
      subtitle={subtitle}
      icon={
        !demo && photoPath
          ? {
              source: photoPath,
              mask: Image.Mask.Circle,
              fallback: Icon.Person,
            }
          : Icon.Person
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={
              <PersonDetail
                person={person}
                photoPath={photoPath}
                cookie={cookie}
                onSignOut={onSignOut}
                demo={demo}
              />
            }
          />
          {person.Username && (
            <Action.CopyToClipboard
              title="Copy Email"
              content={demo ? "username@cedarville.edu" : email(person.Username)}
            />
          )}
          {!demo && person.Username && (
            <Action.OpenInBrowser
              title="Send Email"
              url={`mailto:${email(person.Username)}`}
              icon={Icon.Envelope}
            />
          )}
          {person.OfficePhone && (
            <Action.CopyToClipboard
              title="Copy Phone"
              content={demo ? "ext. ****" : formatPhone(person.OfficePhone)}
            />
          )}
          <Action.CopyToClipboard
            title="Copy ID"
            content={demo ? "000000000" : person.Id}
            icon={Icon.Person}
          />
          {!demo && (
            <Action.OpenInBrowser
              title="Open Info Page"
              url={`https://selfservice.cedarville.edu/Cedarinfo/Info?id=${person.Id}`}
              icon={Icon.Globe}
            />
          )}
          {!demo && (
            <Action.CopyToClipboard
              title="Export as JSON"
              icon={Icon.Code}
              content={JSON.stringify(person, null, 2)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
            />
          )}
          <Action
            title="Sign Out"
            icon={Icon.ArrowLeft}
            onAction={onSignOut}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
        </ActionPanel>
      }
    />
  );
}

// ─── Main command ──────────────────────────────────────────────────────────

export default function SearchDirectory() {
  const { demoMode: demo } = getPreferenceValues<Preferences.SearchDirectory>();
  const [authState, setAuthState] = useState<AuthState>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [results, setResults] = useState<DirectoryPerson[]>([]);
  const [photoPaths, setPhotoPaths] = useState<Record<string, string>>({});
  const [cacheSize, setCacheSize] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [populations, setPopulations] = useState<Population[]>([]);
  const searchRef = useRef<AbortController | null>(null);

  useEffect(() => {
    (async () => {
      let cookie = await getStoredCookie();
      if (!cookie) {
        const pending = await drainPendingCookie();
        if (pending) {
          await storeCookie(pending);
          cookie = pending;
        }
      }

      if (cookie) {
        setAuthState({ kind: "ready", cookie });
        setCacheSize(await getCacheSize());
        getDepartments(cookie).then(setDepartments);
        getPopulations(cookie).then(setPopulations);
        return;
      }
      setAuthState({ kind: "sign-in" });
    })();
  }, []);

  useEffect(() => {
    if (authState.kind !== "ready") return;

    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;

    // Parse filter value into API options
    const apiOptions = filter.startsWith("dept:")
      ? { department: filter.slice(5) }
      : filter.startsWith("pop:")
        ? { population: Number(filter.slice(4)) }
        : {};
    const hasFilter = !!filter;

    // Cache search runs immediately (no debounce)
    if (!hasFilter) {
      searchCache(query.trim()).then((local) => {
        if (!controller.signal.aborted) setResults(local);
      });
    }

    const run = async () => {
      const trimmed = query.trim();

      if (!trimmed) return;

      setIsSearching(true);
      try {
        const { firstName, lastName } = parseSearchQuery(trimmed);

        // For single-word queries, search as both first and last name in parallel
        let fresh: DirectoryPerson[];
        if (trimmed && !lastName) {
          const [byFirst, byLast] = await Promise.all([
            searchDirectory(firstName, "", authState.cookie, apiOptions),
            searchDirectory("", firstName, authState.cookie, apiOptions),
          ]);
          const seen = new Set<string>();
          fresh = [];
          for (const p of [...byFirst, ...byLast]) {
            if (!seen.has(p.Id)) {
              seen.add(p.Id);
              fresh.push(p);
            }
          }
        } else {
          fresh = await searchDirectory(
            firstName,
            lastName,
            authState.cookie,
            apiOptions,
          );
        }

        if (!controller.signal.aborted) {
          await mergePeopleIntoCache(fresh);
          setCacheSize(await getCacheSize());

          if (hasFilter) {
            setResults(fresh);
          } else {
            // Re-run cache search after merge so order stays stable (fuzzy score)
            setResults(await searchCache(trimmed));
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof AuthRequiredError) {
          await clearCookie();
          setAuthState({ kind: "sign-in" });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: String(err),
          });
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    };

    const timer = setTimeout(run, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, filter, authState]);

  useEffect(() => {
    if (authState.kind !== "ready") return;
    const { cookie } = authState;
    for (const person of results) {
      if (!person.PhotoUrl || photoPaths[person.Id]) continue;
      getCachedPhotoPath(person.Id, person.PhotoUrl, cookie).then((p) => {
        if (p) setPhotoPaths((prev) => ({ ...prev, [person.Id]: p }));
      });
    }
  }, [results, authState]);

  async function handleSignOut() {
    await clearCookie();
    setResults([]);
    // Always use the base URL — let the server issue a fresh SAML redirect
    // when the browser opens, rather than using a potentially stale one.
    setAuthState({ kind: "sign-in" });
  }

  async function handleSignIn() {
    setAuthState({ kind: "signing-in" });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening sign-in window…",
      message: "Complete login in the window that opens",
    });
    try {
      const cookie = await launchAuthBrowser();
      await storeCookie(cookie);
      toast.style = Toast.Style.Success;
      toast.title = "Signed in!";
      setCacheSize(await getCacheSize());
      getDepartments(cookie).then(setDepartments);
      getPopulations(cookie).then(setPopulations);
      setAuthState({ kind: "ready", cookie });
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = String(err);
      setAuthState({ kind: "sign-in" });
    }
  }

  // ── Auth screens ────────────────────────────────────────────────────────

  if (authState.kind === "loading") return <List isLoading />;

  if (authState.kind === "sign-in") {
    return (
      <List>
        <List.EmptyView
          title="Sign in to Cedarville"
          description="A small sign-in window will open. No browser or cookies are touched."
          icon={Icon.Lock}
          actions={
            <ActionPanel>
              <Action
                title="Sign In"
                icon={Icon.Person}
                onAction={handleSignIn}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (authState.kind === "signing-in") {
    return (
      <List isLoading>
        <List.EmptyView
          title="Waiting for sign-in…"
          description="Complete login in the window that just opened."
          icon={Icon.Clock}
        />
      </List>
    );
  }

  // ── Ready: search ───────────────────────────────────────────────────────

  return (
    <List
      isLoading={isSearching}
      searchBarPlaceholder="Search by name…"
      onSearchTextChange={setQuery}
      throttle={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All People" value="" />
          {populations.length > 0 && (
            <List.Dropdown.Section title="By Type">
              {populations.map((p) => (
                <List.Dropdown.Item
                  key={p.code}
                  title={p.desc}
                  value={`pop:${p.code}`}
                />
              ))}
            </List.Dropdown.Section>
          )}
          {departments.length > 0 && (
            <List.Dropdown.Section title="By Department">
              {departments.map((d) => (
                <List.Dropdown.Item
                  key={d.code}
                  title={d.description}
                  value={`dept:${d.code}`}
                />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {results.length === 0 ? (
        <List.EmptyView
          title={
            query.trim()
              ? "No results found"
              : "Search the Cedarville Directory"
          }
          description={
            query.trim()
              ? `No one matched "${query}"`
              : cacheSize > 0
                ? `${cacheSize} people cached`
                : "Start typing to search"
          }
          icon={query.trim() ? Icon.MagnifyingGlass : Icon.Person}
        />
      ) : (
        <List.Section
          title={`${results.length} result${results.length !== 1 ? "s" : ""}`}
        >
          {results.map((person) => (
            <PersonListItem
              key={person.Id}
              person={person}
              photoPath={photoPaths[person.Id] ?? null}
              cookie={authState.cookie}
              onSignOut={handleSignOut}
              demo={demo}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
