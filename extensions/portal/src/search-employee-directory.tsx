import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";

const PORTAL_PROXY_URL =
  "https://script.google.com/macros/s/AKfycbwk_ptcxs6hYax7ReXyy7pyRLaJGaElx1qntiRvEeeI2O8DDU_QneF40Y6Ql4I5sG1eNQ/exec";
const SLACK_DEEPLINK_API_URL =
  "https://script.google.com/macros/s/AKfycbyEt6r_jAvd8oiUhkYnAo8PDWPGhj6PWPRqxUYanv0HZE5DkSrSNcWbu_V83HdoW0Vj8A/exec";
const ORG_TOKEN = "b6d3f58c-ec0e-46db-9a62-914c8d8c847e";
const PAGE_SIZE = 3000;
const CACHE_KEY = "ff_portal_directory_v1";

type PassportDetail = {
  employeeNumber?: string;
  name?: string;
  nickname?: string;
  email?: string;
  positionName?: string;
  departmentName?: string;
  divisionName?: string;
  companyName?: string;
  organizationFullName?: string;
  organizationShortName?: string;
  profileImageUrl?: string;
  phoneInside?: string | null;
  phoneMobile?: string | null;
  birthday?: string | null;
  joinedAt?: string | null;
};

type PassportRow = {
  passportId?: string;
  jobDescription?: { summary?: string | null; content?: string | null };
  detail?: PassportDetail;
};

type SearchResponse = {
  meta?: {
    totalCount?: number;
    listSize?: number;
    currentPage?: number;
    endPage?: number;
  };
  data?: PassportRow[];
  error?: string;
  status?: number;
};

type SlackDeeplinkResponse = {
  ok?: boolean;
  deeplink?: string;
  error?: string;
};

function normalizeImg(src?: string) {
  if (!src) return undefined;
  return src.startsWith("//") ? `https:${src}` : src;
}

function normalizeValue(v?: string | null) {
  if (!v) return undefined;
  if (v.trim() === "-" || v.trim() === "") return undefined;
  return v;
}

function mdEscapeEmail(email: string) {
  return email.replace(/_/g, "\\_");
}

async function loadCache(): Promise<PassportRow[] | null> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PassportRow[];
  } catch {
    return null;
  }
}

async function saveCache(rows: PassportRow[]) {
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(rows));
}

async function fetchDirectory(): Promise<PassportRow[]> {
  const url = new URL(PORTAL_PROXY_URL);
  url.searchParams.set("listSize", String(PAGE_SIZE));
  url.searchParams.set("currentPage", "1");
  url.searchParams.set("token", ORG_TOKEN);
  const res = await fetch(url.toString(), { redirect: "follow" });
  if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
  const json = (await res.json()) as SearchResponse;
  if (json.error) throw new Error(json.error);
  return json.data ?? [];
}

function toHaystack(d?: PassportDetail) {
  return [
    d?.name,
    d?.nickname,
    d?.email,
    d?.positionName,
    d?.departmentName,
    d?.divisionName,
    d?.companyName,
    d?.organizationFullName,
    d?.organizationShortName,
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();
}

async function getSlackDeeplink(email: string) {
  const u = new URL(SLACK_DEEPLINK_API_URL);
  u.searchParams.set("token", ORG_TOKEN);
  u.searchParams.set("email", email);
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as SlackDeeplinkResponse;
  if (data.ok && data.deeplink) return data.deeplink;
  throw new Error(data.error || "User not found");
}

async function openSlack(email?: string | null) {
  if (!email) {
    showToast(Toast.Style.Failure, "No email");
    return;
  }
  await showToast({
    style: Toast.Style.Animated,
    title: "Resolving Slack link…",
  });
  try {
    const link = await getSlackDeeplink(email);
    await showToast({ style: Toast.Style.Success, title: "Opening Slack" });
    await open(link);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    showToast(Toast.Style.Failure, "Slack deeplink failed", msg);
  }
}

async function copySlackLink(email?: string | null) {
  if (!email) {
    showToast(Toast.Style.Failure, "No email");
    return;
  }
  await showToast({
    style: Toast.Style.Animated,
    title: "Fetching Slack link…",
  });
  try {
    const link = await getSlackDeeplink(email);
    await Clipboard.copy(link);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Slack deeplink",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    showToast(Toast.Style.Failure, "Copy failed", msg);
  }
}

function teamsLink(email?: string | null) {
  return email ? `msteams:/l/chat/0/0?users=${encodeURIComponent(email)}` : "";
}

async function copyTeamsLink(email?: string | null) {
  if (!email) {
    showToast(Toast.Style.Failure, "No email");
    return;
  }
  try {
    await Clipboard.copy(teamsLink(email));
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Teams deeplink",
    });
  } catch {
    showToast(Toast.Style.Failure, "Copy failed");
  }
}

function renderDetail(raw: PassportRow) {
  const d = raw.detail ?? {};
  const position = normalizeValue(d.positionName);
  const dept = normalizeValue(d.departmentName);
  const name = d.name ?? d.nickname ?? d.email ?? "(no name)";

  const headerLine = position ? `# ${name} ${position}` : `# ${name}`;

  const header = [headerLine, dept ? `_${dept}_` : "", ""].filter(Boolean).join("\n");

  const row = (label: string, value?: string | null) => (value ? `${label}: ${value}  \n` : "");
  const section = (title: string, lines: string[]) => {
    const body = lines.filter(Boolean).join("");
    return body ? `##### ${title}\n\n${body}\n` : "";
  };

  const identifiers = section("Identifiers", [
    row("Employee No.", normalizeValue(d.employeeNumber)),
    row("Passport ID", normalizeValue(raw.passportId)),
  ]);
  const contact = section("Contact", [
    row("Email", d.email ? mdEscapeEmail(d.email) : undefined),
    row("Mobile", normalizeValue(d.phoneMobile)),
    row("Internal Phone", normalizeValue(d.phoneInside)),
    row("Birthday", normalizeValue(d.birthday)),
  ]);
  const org = section("Organization", [
    row("Company", normalizeValue(d.companyName)),
    row("Division", normalizeValue(d.divisionName)),
    row("Department", normalizeValue(d.departmentName)),
    row("Org (Full)", normalizeValue(d.organizationFullName)),
    row("Org (Short)", normalizeValue(d.organizationShortName)),
  ]);

  return [header, identifiers, contact, org].filter(Boolean).join("\n---\n\n");
}

export default function Command(props: { arguments: { keyword?: string } }) {
  const [query, setQuery] = useState(props.arguments.keyword ?? "");
  const [rows, setRows] = useState<PassportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedThisSession = useRef(false);
  const fetchingNow = useRef(false);

  useEffect(() => {
    (async () => {
      const cached = await loadCache();
      if (cached) {
        setRows(cached);
        setLoading(false);
      } else {
        setLoading(true);
        try {
          fetchingNow.current = true;
          const fresh = await fetchDirectory();
          await saveCache(fresh);
          setRows(fresh);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          showToast(Toast.Style.Failure, "Initial sync failed", msg);
        } finally {
          fetchedThisSession.current = true;
          fetchingNow.current = false;
          setLoading(false);
        }
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => toHaystack(r.detail).includes(q));
  }, [rows, query]);

  useEffect(() => {
    if (filtered.length > 0) return;
    if (fetchedThisSession.current) return;
    if (fetchingNow.current) return;
    (async () => {
      fetchingNow.current = true;
      setLoading(true);
      try {
        const fresh = await fetchDirectory();
        await saveCache(fresh);
        setRows(fresh);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(Toast.Style.Failure, "Sync failed", msg);
      } finally {
        fetchedThisSession.current = true;
        fetchingNow.current = false;
        setLoading(false);
      }
    })();
  }, [filtered.length]);

  return (
    <List
      throttle
      isLoading={loading}
      searchText={query}
      onSearchTextChange={setQuery}
      isShowingDetail
      searchBarPlaceholder="Search members by name, position, org…"
    >
      {filtered.map((row) => {
        const d = row.detail ?? {};
        const name = d.name ?? d.nickname ?? d.email ?? "(no name)";
        const position = normalizeValue(d.positionName);
        const dept = normalizeValue(d.departmentName);

        const accessories: List.Item.Accessory[] = [];
        if (position) accessories.push({ text: position });
        if (dept) accessories.push({ text: dept });

        const tLink = teamsLink(d.email);
        const detail = renderDetail(row);

        return (
          <List.Item
            key={row.passportId ?? `${name}-${d.email ?? ""}`}
            icon={
              normalizeImg(d.profileImageUrl)
                ? {
                    source: normalizeImg(d.profileImageUrl)!,
                    mask: Image.Mask.Circle,
                    fallback: Icon.PersonCircle,
                  }
                : { source: Icon.PersonCircle, tintColor: Color.SecondaryText }
            }
            title={name}
            accessories={accessories}
            detail={<List.Item.Detail markdown={detail} />}
            actions={
              <ActionPanel>
                {d.email && (
                  <Action.OpenInBrowser title="Chat in Teams" url={tLink} shortcut={Keyboard.Shortcut.Common.Open} />
                )}
                {d.email && (
                  <Action
                    title="Chat in Slack"
                    icon={Icon.Message}
                    shortcut={{ modifiers: ["shift"], key: "enter" }}
                    onAction={() => openSlack(d.email)}
                  />
                )}
                {d.email && (
                  <ActionPanel.Section title="Links">
                    <Action title="Copy Slack Deeplink" icon={Icon.Link} onAction={() => copySlackLink(d.email)} />
                    <Action title="Copy Teams Deeplink" icon={Icon.Link} onAction={() => copyTeamsLink(d.email)} />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section title="Data">
                  <Action
                    title="Refresh Directory Now"
                    icon={Icon.ArrowClockwise}
                    onAction={async () => {
                      if (fetchingNow.current) return;
                      fetchingNow.current = true;
                      setLoading(true);
                      try {
                        const fresh = await fetchDirectory();
                        await saveCache(fresh);
                        setRows(fresh);
                        fetchedThisSession.current = true;
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : String(e);
                        showToast(Toast.Style.Failure, "Refresh failed", msg);
                      } finally {
                        fetchingNow.current = false;
                        setLoading(false);
                      }
                    }}
                  />
                  <Action
                    title="Clear Cache"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await LocalStorage.removeItem(CACHE_KEY);
                      setRows([]);
                      fetchedThisSession.current = false;
                      showToast(Toast.Style.Success, "Cache cleared");
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
