import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  open,
} from "@raycast/api";
import {
  INSTALL_COMMAND,
  INSTALL_GUIDE_URL,
  deepLink,
  docLink,
  forgetResolvedGadak,
  isSearchFail,
  resolveGadakBinary,
  runRecent,
  runSearch,
  searchErrorDetail,
  searchErrorFull,
  searchErrorTitle,
  type Issue,
  type Match,
  type Page,
  type RecentOk,
  type SearchFail,
} from "./gadak";

/** "3h ago" — coarse on purpose; the row is a memory aid, not a report. */
function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 90) return "just now";
  if (s < 5400) return `${Math.round(s / 60)}m ago`;
  if (s < 129600) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

/** Mirrored Jira/Confluence text is data, not markup: escape CommonMark
 *  punctuation so a title containing `*` or `#` renders literally. */
function escapeMd(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!~>|])/g, "\\$1");
}

/** Bold every occurrence of the query in a snippet. Markdown is the only place
 *  Raycast will render emphasis, so this is the one real highlight we get.
 *  Split on the query first, then escape each piece — escaping first would
 *  insert backslashes that break the match. */
function emphasize(text: string, q: string): string {
  if (!q) return escapeMd(text);
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .split(new RegExp(`(${safe})`, "gi"))
    .map((part, i) => (i % 2 === 1 ? `**${escapeMd(part)}**` : escapeMd(part)))
    .join("");
}

const FIELD_COLOR: Record<string, Color> = {
  title: Color.Blue,
  body: Color.Orange,
  comment: Color.Purple,
};

function MissingBinaryView() {
  return (
    <List.EmptyView
      icon={Icon.Download}
      title="gadak is not installed"
      description="Install gadak, then search again. Or set the gadak binary preference."
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Install Command"
            icon={Icon.Clipboard}
            content={INSTALL_COMMAND}
          />
          <Action.OpenInBrowser
            title="Open Install Guide"
            icon={Icon.Globe}
            url={INSTALL_GUIDE_URL}
          />
        </ActionPanel>
      }
    />
  );
}

function SearchErrorView({ fail }: { fail: SearchFail }) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={searchErrorTitle(fail)}
      description={searchErrorDetail(fail)}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Full Error"
            icon={Icon.Clipboard}
            content={searchErrorFull(fail)}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.Search>();
  const bin = resolveGadakBinary(prefs.gadakPath);
  const profile = prefs.profile?.trim() ?? "";
  const showLatency = Boolean(prefs.showLatency);

  const [text, setText] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [matches, setMatches] = useState<Record<string, Match>>({});
  const [loading, setLoading] = useState(false);
  const [ms, setMs] = useState<number | null>(null);
  const [detail, setDetail] = useState(true);
  const [error, setError] = useState<SearchFail | null>(null);
  const [recent, setRecent] = useState<RecentOk | null>(null);
  const seq = useRef(0);

  // The empty-query home. Loaded once per profile; a failure means the
  // sections just do not render (the search path reports its own errors).
  useEffect(() => {
    if (!bin) return;
    let live = true;
    runRecent(bin, profile).then((r) => {
      if (live) setRecent(r);
    });
    return () => {
      live = false;
    };
  }, [bin, profile]);

  useEffect(() => {
    const q = text.trim();
    if (!bin || !q) {
      setIssues([]);
      setPages([]);
      setMatches({});
      setMs(null);
      setError(null);
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    runSearch(bin, profile, q)
      .then((r) => {
        if (mine !== seq.current) return;
        setIssues(r.issues);
        setPages(r.pages);
        setMatches(r.matches);
        setMs(r.ms);
        setError(null);
      })
      .catch((e) => {
        if (mine !== seq.current) return;
        const fail: SearchFail = isSearchFail(e)
          ? e
          : { stderr: "", message: e instanceof Error ? e.message : String(e) };
        if (fail.code === "ENOENT") forgetResolvedGadak();
        setIssues([]);
        setPages([]);
        setMatches({});
        setError(fail);
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  }, [text, bin, profile]);

  const q = text.trim();
  const hasHits = issues.length > 0 || pages.length > 0;
  const header =
    ms !== null && showLatency
      ? `${ms.toFixed(0)}ms · ${issues.length} issues`
      : `${issues.length} issues`;

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setText}
      searchBarPlaceholder="Search the local gadak mirror…"
      isShowingDetail={detail && hasHits}
      throttle={false}
    >
      {!bin ? (
        <MissingBinaryView />
      ) : error ? (
        <SearchErrorView fail={error} />
      ) : hasHits ? (
        <>
          {issues.length > 0 && (
            <List.Section title={header}>
              {issues.map((it) => {
                const m = matches[it.issue_key];
                const fromBody = m && m.field !== "title";
                return (
                  <List.Item
                    key={it.issue_key}
                    icon={{
                      source: Icon.Circle,
                      tintColor:
                        FIELD_COLOR[m?.field ?? "title"] ?? Color.SecondaryText,
                    }}
                    title={it.issue_key}
                    // The row cannot colour a substring, so it shows the matched
                    // text itself when the hit did not come from the title.
                    subtitle={fromBody ? m.snippet : it.summary}
                    accessories={
                      detail
                        ? undefined
                        : [
                            m
                              ? {
                                  tag: {
                                    value: m.field,
                                    color:
                                      FIELD_COLOR[m.field] ??
                                      Color.SecondaryText,
                                  },
                                }
                              : {},
                            { text: it.status ?? "" },
                          ]
                    }
                    detail={
                      <List.Item.Detail
                        markdown={[
                          `## ${escapeMd(it.summary)}`,
                          "",
                          m
                            ? `> ${emphasize(m.snippet, q)}`
                            : "_no snippet — the title carried the match_",
                        ].join("\n")}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label
                              title="Key"
                              text={it.issue_key}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Status"
                              text={it.status ?? "—"}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Assignee"
                              text={it.assignee ?? "—"}
                            />
                            <List.Item.Detail.Metadata.TagList title="Matched in">
                              <List.Item.Detail.Metadata.TagList.Item
                                text={m?.field ?? "title"}
                                color={
                                  FIELD_COLOR[m?.field ?? "title"] ??
                                  Color.SecondaryText
                                }
                              />
                            </List.Item.Detail.Metadata.TagList>
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <Action
                          title="Open in Gadak"
                          icon={Icon.ArrowRight}
                          onAction={() => open(deepLink(it.issue_key, profile))}
                        />
                        <Action
                          title={detail ? "Hide Detail" : "Show Detail"}
                          icon={Icon.Sidebar}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => setDetail((v) => !v)}
                        />
                        <Action.CopyToClipboard
                          title="Copy Deep Link"
                          icon={Icon.Link}
                          content={deepLink(it.issue_key, profile)}
                        />
                        <Action.CopyToClipboard
                          title="Copy Issue Key"
                          icon={Icon.Clipboard}
                          content={it.issue_key}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
          {pages.length > 0 && (
            <List.Section title={`${pages.length} documents`}>
              {pages.map((p) => (
                <List.Item
                  key={p.key}
                  icon={{ source: Icon.Document, tintColor: Color.Green }}
                  title={p.title}
                  subtitle={detail ? undefined : p.excerpt}
                  accessories={
                    detail
                      ? undefined
                      : [{ tag: { value: p.space_key, color: Color.Green } }]
                  }
                  detail={
                    <List.Item.Detail
                      markdown={[
                        `## ${escapeMd(p.title)}`,
                        "",
                        `> ${emphasize(p.excerpt, q)}`,
                      ].join("\n")}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Space"
                            text={p.space_key || "—"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Author"
                            text={p.author ?? "—"}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Updated"
                            text={
                              p.updated_at ? p.updated_at.slice(0, 10) : "—"
                            }
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Open in Gadak"
                        icon={Icon.ArrowRight}
                        onAction={() => open(docLink(p.key, profile))}
                      />
                      <Action
                        title={detail ? "Hide Detail" : "Show Detail"}
                        icon={Icon.Sidebar}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={() => setDetail((v) => !v)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Deep Link"
                        icon={Icon.Link}
                        content={docLink(p.key, profile)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      ) : !q &&
        recent &&
        (recent.viewed.length > 0 || recent.updated.length > 0) ? (
        <>
          {recent.viewed.length > 0 && (
            <List.Section title="Recently Viewed">
              {recent.viewed.map((v) => (
                <List.Item
                  key={`v-${v.kind}-${v.key}`}
                  icon={
                    v.kind === "page"
                      ? { source: Icon.Document, tintColor: Color.Green }
                      : { source: Icon.Circle, tintColor: Color.Blue }
                  }
                  title={v.title}
                  subtitle={v.kind === "issue" ? v.key : undefined}
                  accessories={[
                    v.status ? { text: v.status } : {},
                    { text: relativeTime(v.viewed_at) },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Open in Gadak"
                        icon={Icon.ArrowRight}
                        onAction={() =>
                          open(
                            v.kind === "page"
                              ? docLink(v.key, profile)
                              : deepLink(v.key, profile),
                          )
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Deep Link"
                        icon={Icon.Link}
                        content={
                          v.kind === "page"
                            ? docLink(v.key, profile)
                            : deepLink(v.key, profile)
                        }
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {(() => {
            const seen = new Set(
              recent.viewed.filter((v) => v.kind === "issue").map((v) => v.key),
            );
            const rows = recent.updated.filter((u) => !seen.has(u.key));
            if (rows.length === 0) return null;
            return (
              <List.Section title="Recently Updated">
                {rows.map((u) => (
                  <List.Item
                    key={`u-${u.key}`}
                    icon={{
                      source: Icon.Circle,
                      tintColor: Color.SecondaryText,
                    }}
                    title={u.key}
                    subtitle={u.summary}
                    accessories={[
                      u.assignee ? { text: u.assignee } : {},
                      u.status ? { text: u.status } : {},
                      { text: relativeTime(u.updated_at) },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Open in Gadak"
                          icon={Icon.ArrowRight}
                          onAction={() => open(deepLink(u.key, profile))}
                        />
                        <Action.CopyToClipboard
                          title="Copy Deep Link"
                          icon={Icon.Link}
                          content={deepLink(u.key, profile)}
                        />
                        <Action.CopyToClipboard
                          title="Copy Issue Key"
                          icon={Icon.Clipboard}
                          content={u.key}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            );
          })()}
        </>
      ) : !q ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to search"
          description="Searches the local gadak mirror. Enter opens the hit in the Gadak app."
        />
      ) : null}
    </List>
  );
}
