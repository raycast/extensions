import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Image,
  List,
  Toast,
  showInFinder,
  showToast,
} from "@raycast/api";
import { createContext, useContext, type ReactElement } from "react";
import { UpdateYcCli } from "../views/updater";
import type {
  CompanyAttributes,
  DealAttributes,
  EmployerAttributes,
  KnowledgeBaseAttributes,
  PostAttributes,
  Position,
  SchoolAttributes,
  SearchItem,
  SearchItemType,
  StartupLibraryAttributes,
  UserAttributes,
} from "./types";
import {
  CLI_SEARCH_TYPE,
  SEARCH_TYPE_ICONS,
  SEARCH_TYPE_LABELS,
} from "./types";
import { runYcCsv, truncate } from "./yc";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { MarkdownPreview } from "../views/preview";

function avatarIcon(
  url: string | null | undefined,
  fallback: Icon,
): Image.ImageLike {
  if (url) return { source: url, mask: Image.Mask.Circle };
  return fallback;
}

function logoIcon(
  url: string | null | undefined,
  fallback: Icon,
): Image.ImageLike {
  if (!url || url.startsWith("/") || url.includes("missing.png"))
    return fallback;
  return { source: url };
}

function markdownLink(title: string, url: string): string {
  const safeTitle = title.replace(/\]/g, "\\]").replace(/\[/g, "\\[");
  return `[${safeTitle}](${url})`;
}

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

function currentPosition(positions: Position[]): Position | undefined {
  return positions.find((p) => !p.end_date) ?? positions[0];
}

function ycBatchOf(positions: Position[]): string | undefined {
  const ycPos = positions.find(
    (p) => p.company_yc && p.company_batches && p.company_batches.length > 0,
  );
  return ycPos?.company_batches?.[0];
}

// Carries the active query and dropdown filter down to per-item actions (e.g.
// CSV export) without threading them through all eight renderer signatures. The
// search command wraps its list body in the provider. `filterType` is the
// selected type, or undefined when the dropdown is on "All".
export const SearchContext = createContext<{
  query: string;
  filterType?: SearchItemType;
}>({ query: "" });

// Slugify a query for a filename: keep word chars, collapse the rest to hyphens.
function csvFileName(query: string, cliType: string): string {
  const slug =
    query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "search";
  return `yc-${slug}-${cliType}.csv`;
}

// Export the FULL matching set for the active dropdown filter via
// `yc search --type`, which returns CSV (and the true total, not just the
// displayed page). Offers saving to ~/Downloads and copying the raw CSV.
//
// Keyed off the dropdown filter, NOT the hovered item: a typed export only makes
// sense for a single type, so these actions render only when the dropdown is on
// a specific type (not "All") — then "Export Deals" unambiguously matches what's
// on screen. Also suppressed when the filter has no clean 1:1 CLI mapping
// (non_yc_company, startup_library), since exporting via the shared CLI type
// would include the sibling's rows that aren't shown.
//
// Returns a fragment of two sibling actions; each fetches on demand (Raycast
// doesn't keep this around, so there's no state to cache between them).
function ExportCsvActions() {
  const { query, filterType } = useContext(SearchContext);
  // Bail (render nothing) unless the filter has a clean 1:1 CLI type. Capturing
  // the narrowed value as a `string`-typed const lets the nested closures use it
  // without re-narrowing (TS doesn't carry the early-return guard into them).
  const cliType: string | null = filterType
    ? CLI_SEARCH_TYPE[filterType]
    : null;
  if (!filterType || !cliType) return null;
  const exportType: string = cliType;
  const type = filterType;
  const label = SEARCH_TYPE_LABELS[type];

  async function fetchCsv(): Promise<{ csv: string; total: number }> {
    if (!query.trim()) {
      throw new Error("Enter a search query first.");
    }
    const result = await runYcCsv(query, exportType);
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.data;
  }

  function failToast(toast: Toast, title: string, error: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = title;
    toast.message = error instanceof Error ? error.message : String(error);
  }

  async function save() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Exporting ${label}…`,
    });
    try {
      const data = await fetchCsv();
      const path = join(homedir(), "Downloads", csvFileName(query, exportType));
      try {
        await writeFile(path, data.csv, "utf8");
      } catch (error) {
        failToast(toast, "Could not write CSV file", error);
        return;
      }
      toast.style = Toast.Style.Success;
      toast.title = `Exported ${data.total} ${label}`;
      toast.message = path.replace(homedir(), "~");
      toast.primaryAction = {
        title: "Show in Finder",
        onAction: () => showInFinder(path),
      };
    } catch (error) {
      failToast(toast, "Export failed", error);
    }
  }

  async function copy() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Copying ${label}…`,
    });
    try {
      const data = await fetchCsv();
      await Clipboard.copy(data.csv);
      toast.style = Toast.Style.Success;
      toast.title = `Copied ${data.total} ${label} as CSV`;
    } catch (error) {
      failToast(toast, "Copy failed", error);
    }
  }

  return (
    <>
      <Action
        title={`Export ${label} as CSV`}
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        onAction={save}
      />
      <Action
        title={`Copy ${label} as CSV`}
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={copy}
      />
    </>
  );
}

type RenderProps = {
  item: SearchItem;
  isShowingDetail: boolean;
  toggleDetail: () => void;
};

export function renderItem({
  item,
  isShowingDetail,
  toggleDetail,
}: RenderProps): ReactElement {
  switch (item.type) {
    case "user":
      return renderUser(
        item.path,
        item.displayed_attributes,
        isShowingDetail,
        toggleDetail,
      );
    case "yc_company":
      return renderCompany(
        item.path,
        item.displayed_attributes,
        true,
        isShowingDetail,
        toggleDetail,
      );
    case "non_yc_company":
      return renderCompany(
        item.path,
        item.displayed_attributes,
        false,
        isShowingDetail,
        toggleDetail,
      );
    case "school":
      return renderSchool(
        item.path,
        item.displayed_attributes,
        isShowingDetail,
        toggleDetail,
      );
    case "post":
      return renderPost(
        item.path,
        item.displayed_attributes,
        isShowingDetail,
        toggleDetail,
      );
    case "deal":
      return renderDeal(
        item.path,
        item.displayed_attributes,
        isShowingDetail,
        toggleDetail,
      );
    case "employer":
      return renderEmployer(
        item.path,
        item.displayed_attributes,
        isShowingDetail,
        toggleDetail,
      );
    case "startup_library":
      return renderArticle(
        "startup_library",
        item.path,
        item.displayed_attributes,
        isShowingDetail,
        toggleDetail,
      );
    case "knowledge_base":
      return renderArticle(
        "knowledge_base",
        item.path,
        item.displayed_attributes,
        isShowingDetail,
        toggleDetail,
      );
  }
}

function ToggleSidebarAction({ onAction }: { onAction: () => void }) {
  return (
    <Action
      icon={Icon.AppWindowSidebarLeft}
      title="Toggle Sidebar"
      onAction={onAction}
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
    />
  );
}

function UniversalActions({
  title,
  url,
  openTitle,
  toggleDetail,
}: {
  title: string;
  url: string;
  openTitle: string;
  toggleDetail: () => void;
}) {
  return (
    <>
      <Action.OpenInBrowser title={openTitle} url={url} />
      <ToggleSidebarAction onAction={toggleDetail} />
      <Action.CopyToClipboard
        title="Copy URL"
        content={url}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
      <Action.CopyToClipboard
        title="Copy as Markdown"
        content={markdownLink(title, url)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      />
      {/* Renders only when the dropdown is filtered to a specific type. */}
      <ExportCsvActions />
      <Action.Push
        title="Update YC CLI"
        icon={Icon.Download}
        target={<UpdateYcCli />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      />
    </>
  );
}

function userMarkdown(a: UserAttributes): string {
  const fullName = `${a.first_name} ${a.last_name}`.trim();
  const lines = [`# ${fullName}`];
  const yc = a.all_positions.filter((p) => p.company_yc);
  const other = a.all_positions.filter((p) => !p.company_yc).slice(0, 6);
  if (yc.length > 0) {
    lines.push("", "## YC Companies");
    for (const p of yc) {
      const batch = p.company_batches?.[0] ? ` (${p.company_batches[0]})` : "";
      const role = p.title ? ` — ${p.title}` : p.role ? ` — ${p.role}` : "";
      lines.push(`- **${p.company_name ?? "Unknown"}**${batch}${role}`);
    }
  }
  if (other.length > 0) {
    lines.push("", "## Other Roles");
    for (const p of other) {
      const role = p.title ? ` — ${p.title}` : "";
      lines.push(`- **${p.company_name ?? "Unknown"}**${role}`);
    }
  }
  return lines.join("\n");
}

function renderUser(
  path: string,
  a: UserAttributes,
  isShowingDetail: boolean,
  toggleDetail: () => void,
): ReactElement {
  const fullName = `${a.first_name} ${a.last_name}`.trim();
  const current = currentPosition(a.all_positions);
  const subtitle = current
    ? [current.title, current.company_name].filter(Boolean).join(" · ")
    : (a.current_location ?? "");
  const batch = ycBatchOf(a.all_positions);

  const accessories: List.Item.Accessory[] = [];
  if (batch) accessories.push({ tag: { value: batch, color: Color.Orange } });
  accessories.push({ tag: { value: SEARCH_TYPE_LABELS.user } });

  const currentCompanyId = current?.company_id;
  const currentCompanyUrl = currentCompanyId
    ? `https://bookface.ycombinator.com/company/${currentCompanyId}`
    : undefined;

  return (
    <List.Item
      key={`user-${a.id}`}
      icon={avatarIcon(a.avatar_thumb, SEARCH_TYPE_ICONS.user)}
      title={fullName}
      subtitle={isShowingDetail ? undefined : subtitle}
      accessories={isShowingDetail ? undefined : accessories}
      detail={
        isShowingDetail ? (
          <List.Item.Detail markdown={userMarkdown(a)} />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <UniversalActions
              title={fullName}
              url={path}
              openTitle="Open Profile in Browser"
              toggleDetail={toggleDetail}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Name" content={fullName} />
            {currentCompanyUrl ? (
              <Action.OpenInBrowser
                title="Open Current Company"
                url={currentCompanyUrl}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function companyMarkdown(a: CompanyAttributes): string {
  const lines = [`# ${a.name}`];
  if (a.batches?.length) lines.push("", `**Batch:** ${a.batches.join(", ")}`);
  if (a.all_locations) lines.push("", `**Location:** ${a.all_locations}`);
  if (a.industries?.length)
    lines.push("", `**Industries:** ${a.industries.join(", ")}`);
  if (a.one_liner) lines.push("", `*${a.one_liner}*`);
  if (a.long_description) lines.push("", a.long_description);
  if (a.active_founders?.length) {
    lines.push("", "## Founders");
    for (const f of a.active_founders) {
      const name = `${f.first_name ?? ""} ${f.last_name ?? ""}`.trim();
      const url = f.search_path;
      const role = f.title ?? f.role ?? "";
      const link = url ? `[${name}](${url})` : `**${name}**`;
      lines.push(`- ${link}${role ? ` — ${role}` : ""}`);
    }
  }
  return lines.join("\n");
}

function renderCompany(
  path: string,
  a: CompanyAttributes,
  isYc: boolean,
  isShowingDetail: boolean,
  toggleDetail: () => void,
): ReactElement {
  const accessories: List.Item.Accessory[] = [];
  const batch = a.batches?.[0];
  if (batch) accessories.push({ tag: { value: batch, color: Color.Orange } });
  accessories.push({
    tag: {
      value: isYc
        ? SEARCH_TYPE_LABELS.yc_company
        : SEARCH_TYPE_LABELS.non_yc_company,
    },
  });

  const founderActions = a.active_founders.slice(0, 5).map((f) => {
    const name = `${f.first_name ?? ""} ${f.last_name ?? ""}`.trim();
    const url = f.search_path;
    if (!name || !url) return null;
    return (
      <Action.OpenInBrowser
        key={`founder-${f.user_id}`}
        title={`Open Founder: ${name}`}
        url={url}
      />
    );
  });

  const hasRichBody = Boolean(a.long_description || a.one_liner);
  const md = companyMarkdown(a);

  return (
    <List.Item
      key={`${isYc ? "yc" : "nonyc"}-${a.id}`}
      icon={logoIcon(a.small_logo_thumb_url, SEARCH_TYPE_ICONS.yc_company)}
      title={a.name}
      subtitle={
        isShowingDetail ? undefined : a.one_liner || a.industries?.[0] || ""
      }
      accessories={isShowingDetail ? undefined : accessories}
      detail={isShowingDetail ? <List.Item.Detail markdown={md} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <UniversalActions
              title={a.name}
              url={path}
              openTitle="Open Company in Browser"
              toggleDetail={toggleDetail}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {hasRichBody ? (
              <Action.Push
                icon={Icon.Eye}
                title="View in Raycast"
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                target={
                  <MarkdownPreview
                    title={a.name}
                    body={md.replace(/^# .*\n?/, "")}
                    url={path}
                    metadata={[
                      ...(a.batches?.length
                        ? [{ label: "Batch", value: a.batches.join(", ") }]
                        : []),
                      ...(a.all_locations
                        ? [{ label: "Location", value: a.all_locations }]
                        : []),
                      ...(a.industries?.length
                        ? [
                            {
                              label: "Industries",
                              value: a.industries.join(", "),
                            },
                          ]
                        : []),
                    ]}
                  />
                }
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Company Name"
              content={a.name}
            />
            {a.one_liner ? (
              <Action.CopyToClipboard
                title="Copy One-Liner"
                content={a.one_liner}
              />
            ) : null}
            {founderActions}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function renderSchool(
  path: string,
  a: SchoolAttributes,
  isShowingDetail: boolean,
  toggleDetail: () => void,
): ReactElement {
  const alumniCount = a.alumni?.length ?? 0;
  const accessories: List.Item.Accessory[] = [];
  if (alumniCount > 0) accessories.push({ text: `${alumniCount} alumni` });
  accessories.push({ tag: { value: SEARCH_TYPE_LABELS.school } });

  const detailMarkdown = `# ${a.name}\n\n**Alumni on Bookface:** ${alumniCount}`;

  return (
    <List.Item
      key={`school-${a.id}`}
      icon={SEARCH_TYPE_ICONS.school}
      title={a.name}
      accessories={isShowingDetail ? undefined : accessories}
      detail={
        isShowingDetail ? (
          <List.Item.Detail markdown={detailMarkdown} />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <UniversalActions
              title={a.name}
              url={path}
              openTitle="Open School in Browser"
              toggleDetail={toggleDetail}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy School Name" content={a.name} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function postMarkdown(a: PostAttributes): string {
  const author = a.searchable_user?.name ?? "Unknown";
  const lines = [`# ${a.title}`, "", `*by ${author}*`];
  if (a.created_at) lines[2] += ` · ${relativeDate(a.created_at)}`;
  if (a.body) lines.push("", a.body);
  if (a.top_comment?.body) {
    const commenter = a.top_comment.user?.name ?? "Unknown";
    lines.push(
      "",
      "---",
      "",
      `**Top comment** — ${commenter}`,
      "",
      a.top_comment.body,
    );
  }
  return lines.join("\n");
}

function renderPost(
  path: string,
  a: PostAttributes,
  isShowingDetail: boolean,
  toggleDetail: () => void,
): ReactElement {
  const author = a.searchable_user?.name ?? "Unknown";
  const accessories: List.Item.Accessory[] = [
    { text: `${a.views_count.toLocaleString()} views` },
  ];
  if (a.created_at) accessories.push({ text: relativeDate(a.created_at) });
  accessories.push({ tag: { value: SEARCH_TYPE_LABELS.post } });

  const authorUrl = a.searchable_user?.search_path;
  const topCommenterUrl = a.top_comment?.user?.search_path;
  const topCommenterName = a.top_comment?.user?.name;
  const md = postMarkdown(a);

  return (
    <List.Item
      key={`post-${a.id}`}
      icon={avatarIcon(a.searchable_user?.avatar_thumb, SEARCH_TYPE_ICONS.post)}
      title={a.title}
      subtitle={isShowingDetail ? undefined : author}
      accessories={isShowingDetail ? undefined : accessories}
      detail={isShowingDetail ? <List.Item.Detail markdown={md} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <UniversalActions
              title={a.title}
              url={path}
              openTitle="Open Post in Browser"
              toggleDetail={toggleDetail}
            />
            <Action.Push
              icon={Icon.Eye}
              title="View in Raycast"
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={
                <MarkdownPreview
                  title={a.title}
                  body={md.replace(/^# .*\n?/, "")}
                  url={path}
                  metadata={[
                    { label: "Author", value: author },
                    { label: "Views", value: a.views_count.toLocaleString() },
                    { label: "Comments", value: String(a.comment_count) },
                    ...(a.created_at
                      ? [{ label: "Posted", value: relativeDate(a.created_at) }]
                      : []),
                  ]}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Post Title" content={a.title} />
            {a.body ? (
              <Action.CopyToClipboard title="Copy Post Body" content={a.body} />
            ) : null}
            {authorUrl ? (
              <Action.OpenInBrowser
                title={`Open Author: ${author}`}
                url={authorUrl}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            ) : null}
            {topCommenterUrl && topCommenterName ? (
              <Action.OpenInBrowser
                title={`Open Top Commenter: ${topCommenterName}`}
                url={topCommenterUrl}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function renderDeal(
  path: string,
  a: DealAttributes,
  isShowingDetail: boolean,
  toggleDetail: () => void,
): ReactElement {
  const accessories: List.Item.Accessory[] = [];
  if (a.high_value)
    accessories.push({ tag: { value: "High Value", color: Color.Green } });
  if (a.collection?.[0]) accessories.push({ text: a.collection[0] });
  accessories.push({ tag: { value: SEARCH_TYPE_LABELS.deal } });

  const detailMarkdown = [
    `# ${a.title}`,
    "",
    `**${a.company_name}**`,
    a.collection?.length ? `*${a.collection.join(" · ")}*` : "",
    "",
    a.details ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <List.Item
      key={`deal-${a.id}`}
      icon={SEARCH_TYPE_ICONS.deal}
      title={truncate(a.title, 90)}
      subtitle={isShowingDetail ? undefined : a.company_name}
      accessories={isShowingDetail ? undefined : accessories}
      detail={
        isShowingDetail ? (
          <List.Item.Detail markdown={detailMarkdown} />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <UniversalActions
              title={a.title}
              url={path}
              openTitle="Open Deal in Browser"
              toggleDetail={toggleDetail}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {a.details ? (
              <Action.CopyToClipboard
                title="Copy Deal Details"
                content={a.details}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Company Name"
              content={a.company_name}
            />
            <Action.OpenInBrowser
              title="Open All Deals"
              url="https://bookface.ycombinator.com/deals"
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function renderEmployer(
  path: string,
  a: EmployerAttributes,
  isShowingDetail: boolean,
  toggleDetail: () => void,
): ReactElement {
  const detailMarkdown = `# ${a.name}`;
  return (
    <List.Item
      key={`employer-${a.id}`}
      icon={logoIcon(a.logo_url, SEARCH_TYPE_ICONS.employer)}
      title={a.name}
      accessories={
        isShowingDetail
          ? undefined
          : [{ tag: { value: SEARCH_TYPE_LABELS.employer } }]
      }
      detail={
        isShowingDetail ? (
          <List.Item.Detail markdown={detailMarkdown} />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <UniversalActions
              title={a.name}
              url={path}
              openTitle="Open Employer in Browser"
              toggleDetail={toggleDetail}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Employer Name"
              content={a.name}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// Startup Library and Knowledge Base are the same "article" content shape, so
// one renderer serves both — parameterized by `type` for the label/icon/key.
type ArticleAttributes = StartupLibraryAttributes | KnowledgeBaseAttributes;
type ArticleType = "startup_library" | "knowledge_base";

function articleMarkdown(a: ArticleAttributes): string {
  const lines = [`# ${a.title}`];
  if (a.description) lines.push("", `*${a.description}*`);
  if (a.body) lines.push("", a.body);
  return lines.join("\n");
}

function renderArticle(
  type: ArticleType,
  path: string,
  a: ArticleAttributes,
  isShowingDetail: boolean,
  toggleDetail: () => void,
): ReactElement {
  const accessories: List.Item.Accessory[] = [];
  const cat = a.categories?.[0] ?? a.parents?.[0]?.title;
  if (cat) accessories.push({ text: cat });
  accessories.push({ tag: { value: SEARCH_TYPE_LABELS[type] } });
  const md = articleMarkdown(a);

  return (
    <List.Item
      key={`${type}-${a.id}`}
      icon={SEARCH_TYPE_ICONS[type]}
      title={a.title}
      subtitle={
        isShowingDetail
          ? undefined
          : a.description
            ? truncate(a.description, 120)
            : ""
      }
      accessories={isShowingDetail ? undefined : accessories}
      detail={isShowingDetail ? <List.Item.Detail markdown={md} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <UniversalActions
              title={a.title}
              url={path}
              openTitle="Open Article in Browser"
              toggleDetail={toggleDetail}
            />
            <Action.Push
              icon={Icon.Eye}
              title="View in Raycast"
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={
                <MarkdownPreview
                  title={a.title}
                  body={md.replace(/^# .*\n?/, "")}
                  url={path}
                  metadata={cat ? [{ label: "Category", value: cat }] : []}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Article Title"
              content={a.title}
            />
            {a.description ? (
              <Action.CopyToClipboard
                title="Copy Description"
                content={a.description}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
