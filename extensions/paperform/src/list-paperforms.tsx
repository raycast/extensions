import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Image,
  List,
  Toast,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { Color, LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

type Preferences = { apiKey: string; businessApi?: boolean };

type PaperformForm = {
  id: string | number;
  slug?: string;
  custom_slug?: string | null;
  name?: string;
  title?: string;
  url?: string;
  cover_image_url?: string;
  created_at?: string;
  updated_at?: string;
  created_at_utc?: string;
  updated_at_utc?: string;
  submission_count?: number;
  disabled?: boolean;
  additional_urls?: {
    edit_url?: string;
    submissions_url?: string;
    duplicate_url?: string;
  };
};

type PaperformSubmission = {
  id: string | number;
  created_at?: string;
  createdAt?: string; // fallback if API returns camelCase
  answers?: Record<string, unknown> | null;
};

type PaperformField = { key: string; label?: string; title?: string; type?: string };

const API_BASE = "https://api.paperform.co/v1";
const FORMS_LIMIT = 100;
const SUBMISSIONS_LIMIT = 100;
const PINS_STORAGE_KEY = "paperform_pinned_form_ids";

export default function Command() {
  const { apiKey, businessApi = false } = getPreferenceValues<Preferences>();
  // Expose API key for AI tools fallback
  useEffect(() => {
    (async () => {
      try {
        if (apiKey) await LocalStorage.setItem("paperform_api_key", apiKey);
      } catch {
        // ignore
      }
    })();
  }, [apiKey]);
  const [searchText, setSearchText] = useState("");
  const [serverQuery, setServerQuery] = useState("");
  const [baseForms, setBaseForms] = useState<PaperformForm[]>([]);
  const [serverForms, setServerForms] = useState<PaperformForm[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [skip, setSkip] = useState<number>(0); // base skip
  const [searchSkip, setSearchSkip] = useState<number>(0); // server search skip
  const [hasMoreBase, setHasMoreBase] = useState<boolean>(true);
  const [hasMoreSearch, setHasMoreSearch] = useState<boolean>(true);
  const [reloadToken, setReloadToken] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [totalFormsBase, setTotalFormsBase] = useState<number | undefined>(undefined);
  const [totalFormsSearch, setTotalFormsSearch] = useState<number | undefined>(undefined);
  const [pinnedIdsArray, setPinnedIdsArray] = useCachedState<string[]>(PINS_STORAGE_KEY, []);

  const pinnedSet = useMemo(() => new Set(pinnedIdsArray), [pinnedIdsArray]);

  // (No local disabled persistence; Business API toggle only when enabled)

  // Base list loader (no search)
  useEffect(() => {
    let isCancelled = false;
    async function load(offset: number) {
      if (offset === 0) {
        setIsLoading(true);
      }
      try {
        const path = `/forms?limit=${FORMS_LIMIT}&skip=${offset}`;
        const res = await apiFetch<unknown>(apiKey, path);
        const list = extractForms(res);
        if (isCancelled) return;
        setBaseForms((prev) => {
          const merged = offset === 0 ? list : [...prev, ...list];
          // Deduplicate by id to avoid duplicates when the API overlaps pages
          const map = new Map<string | number, PaperformForm>();
          for (const f of merged) {
            map.set(f.id, f);
          }
          return Array.from(map.values());
        });
        const metaHasMore = extractHasMore(res);
        setHasMoreBase(typeof metaHasMore === "boolean" ? metaHasMore : list.length === FORMS_LIMIT);
        const metaTotal = extractTotal(res);
        if (typeof metaTotal === "number") setTotalFormsBase(metaTotal);
      } catch (e) {
        handleApiError(e);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }
    load(skip);
    return () => {
      isCancelled = true;
    };
  }, [apiKey, skip, reloadToken]);

  // Server-side search loader (in addition to local filter)
  useEffect(() => {
    const q = serverQuery.trim();
    if (!q) return; // nothing to search server-side
    let isCancelled = false;
    async function load(offset: number) {
      if (offset === 0) setIsLoading(true);
      try {
        const path = `/forms?limit=${FORMS_LIMIT}&skip=${offset}&search=${encodeURIComponent(q)}`;
        const res = await apiFetch<unknown>(apiKey, path);
        const list = extractForms(res);
        if (isCancelled) return;
        setServerForms((prev) => {
          const merged = offset === 0 ? list : [...prev, ...list];
          const map = new Map<string | number, PaperformForm>();
          for (const f of merged) map.set(f.id, f);
          return Array.from(map.values());
        });
        const metaHasMore = extractHasMore(res);
        setHasMoreSearch(typeof metaHasMore === "boolean" ? metaHasMore : list.length === FORMS_LIMIT);
        const metaTotal = extractTotal(res);
        if (typeof metaTotal === "number") setTotalFormsSearch(metaTotal);
      } catch (e) {
        handleApiError(e);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }
    load(searchSkip);
    return () => {
      isCancelled = true;
    };
  }, [apiKey, serverQuery, searchSkip, reloadToken]);

  // Debounce server-side search to reduce API calls (do not clear base list)
  useEffect(() => {
    const handle = setTimeout(() => {
      const q = searchText;
      setServerQuery(q);
      setServerForms([]);
      setSearchSkip(0);
      setHasMoreSearch(true);
      setTotalFormsSearch(undefined);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchText]);

  const combinedForms = useMemo(() => {
    const list = serverQuery.trim() ? [...baseForms, ...serverForms] : baseForms;
    const map = new Map<string | number, PaperformForm>();
    for (const f of list) map.set(f.id, f);
    return Array.from(map.values());
  }, [baseForms, serverForms, serverQuery]);

  const onLoadMore = useCallback(() => {
    const activeHasMore = serverQuery.trim() ? hasMoreSearch : hasMoreBase;
    if (!activeHasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    if (serverQuery.trim()) setSearchSkip(serverForms.length);
    else setSkip(baseForms.length);
  }, [hasMoreBase, hasMoreSearch, isLoadingMore, serverQuery, serverForms.length, baseForms.length]);

  const hasMore = useMemo(
    () => (serverQuery.trim() ? hasMoreSearch : hasMoreBase),
    [serverQuery, hasMoreSearch, hasMoreBase],
  );
  const pagination = useMemo(() => ({ pageSize: FORMS_LIMIT, hasMore, onLoadMore }), [hasMore, onLoadMore]);

  const refresh = () => {
    setBaseForms([]);
    setSkip(0);
    setHasMoreBase(true);
    setServerForms([]);
    setSearchSkip(0);
    setHasMoreSearch(true);
    setTotalFormsBase(undefined);
    setTotalFormsSearch(undefined);
    setReloadToken((t) => t + 1);
  };

  const sorted = useMemo(() => {
    const arr = [...combinedForms];
    arr.sort((a, b) => {
      const aPinned = pinnedSet.has(String(a.id));
      const bPinned = pinnedSet.has(String(b.id));
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      const at = getFormCreatedAt(a);
      const bt = getFormCreatedAt(b);
      const aTime = at ? Date.parse(at) : 0;
      const bTime = bt ? Date.parse(bt) : 0;
      return bTime - aTime;
    });
    return arr;
  }, [combinedForms, pinnedSet]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={useMemo(() => {
        const q = serverQuery.trim();
        const total = q ? (totalFormsSearch ?? serverForms.length) : (totalFormsBase ?? baseForms.length);
        return total > 0 ? `Search ${total} Paperform${total === 1 ? "" : "s"} by title` : "Search Paperforms by title";
      }, [serverQuery, totalFormsSearch, serverForms.length, totalFormsBase, baseForms.length])}
      filtering
      pagination={pagination}
    >
      {sorted.map((form) => {
        const idStr = String(form.id);
        const pinned = pinnedSet.has(idStr);
        return (
          <List.Item
            key={idStr}
            icon={getFormIcon(form)}
            title={form.name || form.title || form.slug || String(form.id)}
            subtitle={form.custom_slug || form.slug || undefined}
            accessories={buildFormAccessories(form, pinned)}
            actions={
              <FormActions
                form={form}
                refresh={refresh}
                isPinned={pinned}
                businessApi={businessApi}
                pin={(id) => setPinnedIdsArray((prev = []) => Array.from(new Set([...prev, id])))}
                unpin={(id) => setPinnedIdsArray((prev = []) => prev.filter((x) => x !== id))}
              />
            }
          />
        );
      })}
    </List>
  );
}

function buildFormAccessories(form: PaperformForm, pinned = false): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (pinned) accessories.push({ icon: Icon.Pin, tooltip: "Pinned" });

  const updated = getFormUpdatedAt(form);
  if (updated) {
    const rel = formatRelativeEdited(updated);
    if (rel) accessories.push({ text: rel, tooltip: "Edited" });
  }

  const live = getFormLiveStatus(form);
  const apiDisabled = !!(form as Record<string, unknown>)?.["disabled"];
  const closed = apiDisabled || live === false;
  if (typeof form.submission_count === "number") {
    accessories.push({
      icon: closed ? Icon.CircleDisabled : Icon.List,
      text: String(form.submission_count),
      tooltip: closed ? "No longer accepting submissions" : "Submissions",
    });
  } else if (closed) {
    // Show closed state even if we don't have a count
    accessories.push({ icon: Icon.CircleDisabled, tooltip: "No longer accepting submissions" });
  }
  return accessories;
}

function getFormCreatedAt(form: PaperformForm): string | undefined {
  return form.created_at_utc || form.created_at;
}

function getFormUpdatedAt(form: PaperformForm): string | undefined {
  return form.updated_at_utc || form.updated_at;
}

function getFormIcon(form: PaperformForm) {
  const live = getFormLiveStatus(form);
  const apiDisabled = !!(form as Record<string, unknown>)?.["disabled"];
  if (apiDisabled || live === false) return { source: Icon.CircleDisabled, tintColor: Color.Red } as const;
  const cover = (form.cover_image_url || "").trim();
  if (cover) return { source: cover, mask: Image.Mask.RoundedRectangle } as const;
  return { source: "extension_icon.png", mask: Image.Mask.RoundedRectangle } as const;
}

function getFormLiveStatus(form: PaperformForm): boolean | undefined {
  const rec = asRecord(form);
  if (!rec) return undefined;
  const candidates = ["is_live", "live", "is_published", "published", "is_active", "active"];
  for (const key of candidates) {
    const v = rec[key];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.toLowerCase();
      if (s === "true" || s === "live" || s === "published" || s === "active") return true;
      if (s === "false" || s === "draft" || s === "archived" || s === "inactive") return false;
    }
  }
  const status = rec["status"];
  if (typeof status === "string") {
    const s = status.toLowerCase();
    if (s.includes("live") || s.includes("published") || s.includes("active")) return true;
    if (s.includes("draft") || s.includes("archived")) return false;
  }
  return undefined;
}

// Local disabled is handled in Command via LocalStorage; API-disabled not used without Business plan

function FormActions({
  form,
  refresh,
  pin,
  unpin,
  isPinned,
  businessApi,
}: {
  form: PaperformForm;
  refresh: () => void;
  pin: (id: string) => void;
  unpin: (id: string) => void;
  isPinned: boolean;
  businessApi: boolean;
}) {
  const linkSlug = (form.custom_slug || form.slug || String(form.id)) as string;
  const submissionsUrl = form.additional_urls?.submissions_url || `https://paperform.co/submissions/${linkSlug}`;
  const editUrl = form.additional_urls?.edit_url || `https://paperform.co/edit/${linkSlug}`;
  const duplicateUrl = form.additional_urls?.duplicate_url;
  const viewUrl = form.url || `https://${linkSlug}.paperform.co`;
  const { apiKey } = getPreferenceValues<Preferences>();
  const idForApi = String(form.id || linkSlug);
  const remoteDisabled = !!(form as Record<string, unknown>)?.["disabled"];
  return (
    <ActionPanel>
      <Action.Push
        title="Open Submissions"
        icon={Icon.List}
        target={<SubmissionsList slug={linkSlug} formTitle={form.name || form.title || form.slug || String(form.id)} />}
      />
      <Action.OpenInBrowser title="Open Submissions Page" url={submissionsUrl} icon={Icon.Globe} />
      {isPinned ? (
        <Action
          title="Unpin Form"
          icon={Icon.PinDisabled}
          onAction={() => unpin(String(form.id))}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        />
      ) : (
        <Action
          title="Pin Form"
          icon={Icon.Pin}
          onAction={() => pin(String(form.id))}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        />
      )}
      <Action.OpenInBrowser
        title="View Form"
        url={viewUrl}
        icon={Icon.Globe}
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
      <Action.OpenInBrowser
        title="Edit Form"
        url={editUrl}
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
      />
      {duplicateUrl ? (
        <Action.OpenInBrowser
          title="Duplicate Form"
          url={duplicateUrl}
          icon={Icon.Duplicate}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        />
      ) : null}
      {businessApi ? (
        remoteDisabled ? (
          <Action
            title="Enable Submissions"
            icon={Icon.Play}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            onAction={async () => {
              const toast = await showToast({ style: Toast.Style.Animated, title: "Enabling submissions..." });
              try {
                await apiFetchJson(apiKey!, `/forms/${encodeURIComponent(idForApi)}`, "PUT", { disabled: false });
                await showToast({ style: Toast.Style.Success, title: "Submissions enabled" });
                refresh();
              } catch (e) {
                const err = e as Error;
                await showToast({ style: Toast.Style.Failure, title: "Failed to enable", message: err.message });
              } finally {
                toast.hide();
              }
            }}
          />
        ) : (
          <Action
            title="Disable Submissions"
            icon={Icon.Stop}
            shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            onAction={async () => {
              const toast = await showToast({ style: Toast.Style.Animated, title: "Disabling submissions..." });
              try {
                await apiFetchJson(apiKey!, `/forms/${encodeURIComponent(idForApi)}`, "PUT", { disabled: true });
                await showToast({ style: Toast.Style.Success, title: "Submissions disabled" });
                refresh();
              } catch (e) {
                const err = e as Error;
                await showToast({ style: Toast.Style.Failure, title: "Failed to disable", message: err.message });
              } finally {
                toast.hide();
              }
            }}
          />
        )
      ) : null}
      <Action.CopyToClipboard title="Copy Form URL" content={viewUrl} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      <Action.CopyToClipboard
        title="Copy Form ID"
        content={linkSlug}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action
        title="Refresh"
        onAction={refresh}
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
    </ActionPanel>
  );
}

function SubmissionsList({ slug, formTitle }: { slug: string; formTitle: string }) {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [submissions, setSubmissions] = useState<PaperformSubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subSkip, setSubSkip] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [fields, setFields] = useState<PaperformField[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [searchText, setSearchText] = useState("");
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    let isCancelled = false;
    async function load(offset: number) {
      if (offset === 0) setIsLoading(true);
      try {
        const path = `/forms/${encodeURIComponent(slug)}/submissions?limit=${SUBMISSIONS_LIMIT}&skip=${offset}`;
        const res = await apiFetch<unknown>(apiKey, path);
        const list = extractSubmissions(res);
        if (isCancelled) return;
        setSubmissions((prev) => {
          const merged = offset === 0 ? list : [...prev, ...list];
          const map = new Map<string | number, PaperformSubmission>();
          for (const s of merged) map.set(s.id, s);
          return Array.from(map.values());
        });
        const metaHasMore = extractHasMore(res);
        setHasMore(typeof metaHasMore === "boolean" ? metaHasMore : list.length === SUBMISSIONS_LIMIT);
        const metaTotal = extractTotal(res);
        if (typeof metaTotal === "number") setTotalCount(metaTotal);
      } catch (e) {
        handleApiError(e);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }
    load(subSkip);
    return () => {
      isCancelled = true;
    };
  }, [apiKey, slug, subSkip]);

  // Fetch form fields once to help identify Name/Email
  useEffect(() => {
    let cancelled = false;
    async function fetchFields() {
      try {
        const resp = await apiFetch<unknown>(apiKey, `/forms/${encodeURIComponent(slug)}/fields`);
        const f = extractFields(resp);
        if (!cancelled) setFields(f);
      } catch {
        // non-fatal
      }
    }
    fetchFields();
    return () => {
      cancelled = true;
    };
  }, [apiKey, slug]);

  // No per-submission detail fetching; rely on /submissions + /fields

  const onLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setSubSkip(submissions.length);
  }, [hasMore, isLoadingMore, submissions.length]);

  const pagination = useMemo(() => ({ pageSize: SUBMISSIONS_LIMIT, hasMore, onLoadMore }), [hasMore, onLoadMore]);

  const filteredSubmissions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((s) => {
      const id = String(s.id).toLowerCase();
      if (id.includes(q)) return true;
      const detail = s as PaperformSubmission;
      const title = (buildSubmissionTitle(String(s.id), detail, fields) || "").toLowerCase();
      if (title.includes(q)) return true;
      const md = buildSubmissionMarkdown(detail, fields).toLowerCase();
      if (md.includes(q)) return true;
      return false;
    });
  }, [submissions, fields, searchText]);

  const orderedSubmissions = useMemo(() => {
    return [...filteredSubmissions].sort((s1, s2) => {
      const a = getSubmissionCreatedAtGeneric(s1);
      const b = getSubmissionCreatedAtGeneric(s2);
      const at = a ? Date.parse(a) : 0;
      const bt = b ? Date.parse(b) : 0;
      return bt - at;
    });
  }, [filteredSubmissions]);

  const searchPlaceholder = useMemo(() => {
    const count = totalCount ?? submissions.length;
    if (count > 0) return `Search ${count} submission${count === 1 ? "" : "s"} in ${formTitle}`;
    return `Search submissions in ${formTitle}`;
  }, [submissions.length, totalCount, formTitle]);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      pagination={pagination}
      isShowingDetail
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchPlaceholder}
    >
      {orderedSubmissions.map((s) => {
        const created = getSubmissionCreatedAtGeneric(s);
        const detail = s as PaperformSubmission;
        const title = buildSubmissionTitle(String(s.id), detail, fields) || String(s.id);
        const url = `https://paperform.co/submissions/${slug}/inbox?selected_submission_id=${encodeURIComponent(String(s.id))}`;
        const md = buildSubmissionMarkdownWithCreated(detail, fields, created);
        return (
          <List.Item
            key={String(s.id)}
            title={title}
            detail={<List.Item.Detail markdown={md} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={url} />
                <Action.Push
                  title="View Full Details"
                  icon={Icon.AppWindow}
                  target={
                    <SubmissionDetail slug={slug} id={String(s.id)} initialFields={fields} initialDetail={detail} />
                  }
                />
                {(() => {
                  const c = extractChargeInfo(detail);
                  const stripeUrl = c?.stripeCustomerUrl;
                  if (!stripeUrl) return null;
                  return (
                    <Action.OpenInBrowser
                      title="Open Stripe Customer"
                      url={stripeUrl}
                      icon={Icon.CreditCard}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  );
                })()}
                <Action.CopyToClipboard
                  content={url}
                  title="Copy Submission URL"
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function SubmissionDetail({
  slug,
  id,
  initialFields,
  initialDetail,
}: {
  slug: string;
  id: string;
  initialFields?: PaperformField[];
  initialDetail?: PaperformSubmission;
}) {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [fields, setFields] = useState<PaperformField[]>(initialFields ?? []);
  const [detail, setDetail] = useState<PaperformSubmission | undefined>(initialDetail);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // If both are preloaded, skip fetching
        if ((initialFields?.length ?? 0) > 0 && initialDetail) {
          setLoading(false);
          return;
        }
        // Fetch missing parts
        const tasks: Array<Promise<void>> = [];
        if (!(initialFields?.length ?? 0)) {
          tasks.push(
            apiFetch<unknown>(apiKey, `/forms/${encodeURIComponent(slug)}/fields`).then((fResp) => {
              if (cancelled) return;
              setFields(extractFields(fResp));
            }),
          );
        }
        if (!initialDetail) {
          tasks.push(
            apiFetch<unknown>(apiKey, `/submissions/${encodeURIComponent(id)}`).then((dResp) => {
              if (cancelled) return;
              setDetail(extractSubmissionDetail(dResp));
            }),
          );
        }
        await Promise.all(tasks);
      } catch (e) {
        handleApiError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [apiKey, slug, id, initialFields, initialDetail]);

  const url = `https://paperform.co/submissions/${slug}/inbox?selected_submission_id=${encodeURIComponent(id)}`;
  const markdown = buildSubmissionMarkdown(detail, fields);

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard content={url} title="Copy Submission URL" />
        </ActionPanel>
      }
    />
  );
}

async function apiFetch<T>(apiKey: string, path: string, retries = 1): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (res.status === 401) {
    const toast = await showToast({ style: Toast.Style.Failure, title: "Unauthorized", message: "Check API Key" });
    toast.primaryAction = {
      title: "Open Developer Page",
      onAction: () => open("https://paperform.co/account/developer"),
    };
    throw new Error("unauthorized");
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    const waitMs = (retryAfter ? Number(retryAfter) : 1) * 1000;
    if (retries > 0) {
      await sleep(waitMs);
      return apiFetch<T>(apiKey, path, retries - 1);
    }
    await showToast({ style: Toast.Style.Failure, title: "Rate limited", message: "Please try again shortly" });
    throw new Error("rate_limited");
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      if (text) message = `${message}: ${text.slice(0, 200)}`;
    } catch {
      // ignore
    }
    if (res.status === 403) message = "Update form requires Business API access";
    if (res.status === 404) message = "Form not found or insufficient permissions";
    throw new Error(message);
  }
  return (await res.json()) as T;
}

async function apiFetchJson<T>(
  apiKey: string,
  path: string,
  method: "PUT" | "POST" | "PATCH" | "DELETE",
  body: unknown,
  retries = 1,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  if (res.status === 401) {
    const toast = await showToast({ style: Toast.Style.Failure, title: "Unauthorized", message: "Check API Key" });
    toast.primaryAction = {
      title: "Open Developer Page",
      onAction: () => open("https://paperform.co/account/developer"),
    };
    throw new Error("unauthorized");
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    const waitMs = (retryAfter ? Number(retryAfter) : 1) * 1000;
    if (retries > 0) {
      await sleep(waitMs);
      return apiFetchJson<T>(apiKey, path, method, body, retries - 1);
    }
    await showToast({ style: Toast.Style.Failure, title: "Rate limited", message: "Please try again shortly" });
    throw new Error("rate_limited");
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

function handleApiError(e: unknown) {
  const err = e as Error;
  if (err.message === "unauthorized" || err.message === "rate_limited") return; // already handled
  showToast({ style: Toast.Style.Failure, title: "Failed to load", message: err.message });
}

function extractForms(input: unknown): PaperformForm[] {
  if (Array.isArray(input)) return input as PaperformForm[];
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const data = obj["data"];
    const results = obj["results"] as Record<string, unknown> | undefined;
    if (Array.isArray(data)) return data as PaperformForm[];
    if (data && typeof data === "object") {
      const maybeForms = (data as Record<string, unknown>)["forms"];
      if (Array.isArray(maybeForms)) return maybeForms as PaperformForm[];
    }
    if (Array.isArray(obj["forms"])) return obj["forms"] as PaperformForm[];
    if (results && Array.isArray(results["forms"])) return results["forms"] as PaperformForm[];
  }
  return [];
}

function extractHasMore(input: unknown): boolean | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as Record<string, unknown>;
  const tryBool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
  const direct = tryBool(obj["has_more"]);
  if (typeof direct === "boolean") return direct;
  const data = obj["data"];
  if (data && typeof data === "object") {
    const v = (data as Record<string, unknown>)["has_more"];
    if (typeof v === "boolean") return v;
  }
  const results = obj["results"];
  if (results && typeof results === "object") {
    const v = (results as Record<string, unknown>)["has_more"];
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

function extractTotal(input: unknown): number | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as Record<string, unknown>;
  const tryNum = (v: unknown) => (typeof v === "number" ? v : undefined);
  const direct = tryNum(obj["total"]);
  if (typeof direct === "number") return direct;
  const data = obj["data"];
  if (data && typeof data === "object") {
    const v = (data as Record<string, unknown>)["total"];
    if (typeof v === "number") return v;
  }
  const results = obj["results"];
  if (results && typeof results === "object") {
    const v = (results as Record<string, unknown>)["total"];
    if (typeof v === "number") return v;
  }
  return undefined;
}

function extractSubmissions(input: unknown): PaperformSubmission[] {
  if (Array.isArray(input)) return input as PaperformSubmission[];
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const data = obj["data"];
    const results = obj["results"] as Record<string, unknown> | undefined;
    if (Array.isArray(data)) return data as PaperformSubmission[];
    if (results && Array.isArray(results["submissions"])) return results["submissions"] as PaperformSubmission[];
  }
  return [];
}

function extractFields(input: unknown): PaperformField[] {
  if (Array.isArray(input)) return input as PaperformField[];
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const data = obj["data"];
    const results = obj["results"] as Record<string, unknown> | undefined;
    if (Array.isArray(data)) return data as PaperformField[];
    if (results && Array.isArray(results["fields"])) return results["fields"] as PaperformField[];
    const form = results && (results["form"] as Record<string, unknown> | undefined);
    if (form && Array.isArray(form["fields"])) return form["fields"] as PaperformField[];
  }
  return [];
}

function extractSubmissionDetail(input: unknown): PaperformSubmission | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as Record<string, unknown>;
  const results = obj["results"] as Record<string, unknown> | undefined;
  if (results && results["submission"]) return results["submission"] as PaperformSubmission;
  if (obj["submission"]) return obj["submission"] as PaperformSubmission;
  return obj as unknown as PaperformSubmission;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function getSubmissionCreatedAtGeneric(s: unknown): string | undefined {
  const rec = asRecord(s);
  if (!rec) return undefined;
  const ts = rec["created_at_utc"] ?? rec["created_at"] ?? rec["createdAt"];
  return typeof ts === "string" ? ts : undefined;
}

function getAnswers(detail: PaperformSubmission | undefined): Record<string, unknown> {
  const rec = asRecord(detail) ?? {};
  const answers = rec["answers"] ?? rec["data"] ?? rec["submission"];
  return asRecord(answers) ?? {};
}

function hasValue(obj: unknown): obj is { value: unknown } {
  return !!obj && typeof obj === "object" && "value" in (obj as Record<string, unknown>);
}

function formatAnswerValue(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) return raw.map((x) => String(asRecord(x)?.value ?? x)).join(", ");
  if (hasValue(raw)) return String((raw as { value: unknown }).value);
  if (typeof raw === "object") return JSON.stringify(raw);
  return String(raw);
}

function buildSubmissionTitle(
  id: string,
  detail: PaperformSubmission | undefined,
  fields: PaperformField[],
): string | undefined {
  if (!detail) return undefined;
  const answers = getAnswers(detail);
  const findValBy = (pred: (f: PaperformField) => boolean): string | undefined => {
    const field = fields.find(pred);
    if (!field) return undefined;
    const raw = answers[field.key];
    return formatAnswerValue(raw);
  };
  const labelOf = (f: PaperformField) => (f.label || f.title || "").toLowerCase();
  const keyOf = (f: PaperformField) => (f.key || "").toLowerCase();
  const hasAll = (l: string, tokens: string[]) => tokens.every((t) => l.includes(t));

  const isEmail = (f: PaperformField) => (f.type || "").toLowerCase() === "email" || labelOf(f).includes("email");
  const isFirstName = (f: PaperformField) =>
    hasAll(labelOf(f), ["first", "name"]) || keyOf(f) === "first_name" || keyOf(f) === "firstname";
  const isLastName = (f: PaperformField) =>
    hasAll(labelOf(f), ["last", "name"]) ||
    keyOf(f) === "last_name" ||
    keyOf(f) === "lastname" ||
    labelOf(f).includes("surname") ||
    keyOf(f).includes("surname");
  const isFullName = (f: PaperformField) => {
    const l = labelOf(f);
    const k = keyOf(f);
    if (hasAll(l, ["full", "name"]) || k === "full_name") return true;
    if (hasAll(l, ["your", "name"]) || hasAll(l, ["full", "name"]) || l === "name" || k === "name" || k === "full_name")
      return true;
    return false;
  };

  const email = findValBy(isEmail);
  const first = findValBy(isFirstName);
  const last = findValBy(isLastName);
  const full = findValBy(isFullName);

  const name = full || [first, last].filter(Boolean).join(" ");
  if (name && email) return `${name} <${email}>`;
  if (name) return name;
  if (email) return email;
  return id;
}

function buildSubmissionMarkdown(detail: PaperformSubmission | undefined, fields: PaperformField[]): string {
  if (!detail) return "Loading submission...";
  const answers = getAnswers(detail);
  const blocks: string[] = [];
  // Payment summary
  const charge = extractChargeInfo(detail);
  if (charge && (typeof charge.totalCents === "number" || typeof charge.total === "number")) {
    const cents =
      typeof charge.totalCents === "number" ? charge.totalCents : Math.round((charge.total as number) * 100);
    if (cents > 0) {
      const currency = (charge.currency || "USD").toUpperCase();
      const formatted = formatCurrency(cents, currency);
      blocks.push(`**Total Charged**\n\n${formatted}`);
    }
  }
  const labelFor = (key: string) =>
    fields.find((f) => f.key === key)?.label || fields.find((f) => f.key === key)?.title || key;
  for (const key of Object.keys(answers)) {
    const raw = answers[key];
    const isScoreField = key.toLowerCase() === "score";
    const isFalse = raw === false || (typeof raw === "string" && raw.toLowerCase() === "false");
    if (isScoreField && isFalse) continue;
    const val = formatAnswerValue(raw) ?? "";
    if (val.length > 0) {
      const safeLabel = escapeMarkdownLabel(labelFor(key));
      blocks.push(`**${safeLabel}**\n\n> ${val}`);
    }
  }
  // Device + UTM
  const device = extractDeviceInfo(detail);
  const deviceLines: string[] = [];
  if (device) {
    const utmPairs: Array<[string, string | undefined]> = [
      ["Source", device.utm_source],
      ["Medium", device.utm_medium],
      ["Campaign", device.utm_campaign],
      ["Term", device.utm_term],
      ["Content", device.utm_content],
    ];
    const utmLines = utmPairs
      .filter(([, v]) => !!(v && v.trim()))
      .map(([k, v]) => `**UTM ${k}**\n\n\`${v as string}\``);
    if (utmLines.length) deviceLines.push(...utmLines);

    const parts: string[] = [];
    if (device.type) parts.push(device.type);
    if (device.device) parts.push(device.device);
    if (device.platform) parts.push(device.platform);
    if (device.browser) parts.push(device.browser);
    if (parts.length) deviceLines.push(`**Device**\n\n- ${parts.join(", ")}`);
  }
  if (deviceLines.length) blocks.push("\n---\n", ...deviceLines);
  if (!blocks.length) return "No fields found for this submission.";
  return blocks.join("\n\n");
}

function buildSubmissionMarkdownWithCreated(
  detail: PaperformSubmission | undefined,
  fields: PaperformField[],
  created: string | undefined,
): string {
  const base = buildSubmissionMarkdown(detail, fields);
  const createdLabel = created ? new Date(created).toLocaleString() : undefined;
  if (!createdLabel) return base;
  const header = `**Submitted**\n\n${createdLabel}`;
  if (!base || base.trim().length === 0) return header;
  return `${header}\n\n${base}`;
}

function formatRelativeEdited(ts: string): string | undefined {
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return undefined;
  let diff = Date.now() - t;
  if (diff < 0) diff = 0;
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;
  if (diff >= year) return "over a year ago";
  if (diff >= month) {
    const m = Math.max(1, Math.round(diff / month));
    return `${m} month${m === 1 ? "" : "s"} ago`;
  }
  if (diff >= day) {
    const d = Math.max(1, Math.round(diff / day));
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }
  const h = Math.max(1, Math.round(diff / hour));
  return `${h} hour${h === 1 ? "" : "s"} ago`;
}

function formatCurrency(totalCents: number, currency: string): string {
  try {
    const amount = Math.round(totalCents) / 100;
    return amount.toLocaleString("en-US", { style: "currency", currency });
  } catch {
    const amount = Math.round(totalCents) / 100;
    return `$${amount.toFixed(2)}`;
  }
}

function extractChargeInfo(
  detail: unknown,
): { totalCents?: number; total?: number; currency?: string; stripeCustomerUrl?: string } | undefined {
  const rec = asRecord(detail);
  if (!rec) return undefined;
  const charge = asRecord(rec["charge"]);
  if (!charge) return undefined;
  const totalCents = typeof charge["total_cents"] === "number" ? (charge["total_cents"] as number) : undefined;
  const total = typeof charge["total"] === "number" ? (charge["total"] as number) : undefined;
  let currency: string | undefined = undefined;
  const nested = asRecord(charge["charge"]);
  if (nested && typeof nested["currency"] === "string") currency = nested["currency"] as string;
  const cust = asRecord(charge["customer"]);
  const stripeCustomerUrl = typeof cust?.["url"] === "string" ? (cust["url"] as string) : undefined;
  return { totalCents, total, currency, stripeCustomerUrl };
}

function extractDeviceInfo(detail: unknown):
  | {
      type?: string;
      device?: string;
      platform?: string;
      browser?: string;
      url?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_term?: string;
      utm_content?: string;
    }
  | undefined {
  const rec = asRecord(detail);
  if (!rec) return undefined;
  const dev = asRecord(rec["device"]);
  if (!dev) return undefined;
  return {
    type: typeof dev["type"] === "string" ? (dev["type"] as string) : undefined,
    device: typeof dev["device"] === "string" ? (dev["device"] as string) : undefined,
    platform: typeof dev["platform"] === "string" ? (dev["platform"] as string) : undefined,
    browser: typeof dev["browser"] === "string" ? (dev["browser"] as string) : undefined,
    url: typeof dev["url"] === "string" ? (dev["url"] as string) : undefined,
    utm_source: typeof dev["utm_source"] === "string" ? (dev["utm_source"] as string) : undefined,
    utm_medium: typeof dev["utm_medium"] === "string" ? (dev["utm_medium"] as string) : undefined,
    utm_campaign: typeof dev["utm_campaign"] === "string" ? (dev["utm_campaign"] as string) : undefined,
    utm_term: typeof dev["utm_term"] === "string" ? (dev["utm_term"] as string) : undefined,
    utm_content: typeof dev["utm_content"] === "string" ? (dev["utm_content"] as string) : undefined,
  };
}

// No longer fetching latest submission timestamps for forms to avoid extra API calls

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeMarkdownLabel(input: string): string {
  const trimmed = (input || "").trim();
  // Strip stray emphasis asterisks that may be included in the label text
  const stripped = trimmed.replace(/^\*+\s*/, "").replace(/\s*\*+$/, "");
  // Escape markdown special characters so wrapping with **...** is safe
  const ESC = new Set(["\\", "`", "*", "_", "{", "}", "[", "]", "(", ")", "#", "+", "-", ".", "!", "|", ">"]);
  return stripped.replace(/./g, (ch) => (ESC.has(ch) ? `\\${ch}` : ch));
}
