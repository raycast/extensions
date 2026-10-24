import { getPreferenceValues } from "@raycast/api";
import { helperRequest, SCAN_TIMEOUT } from "./design";
import { LicenseSummary } from "./license";
import { escapeMarkdown } from "./markdown";
import { Site } from "./sites";

/** Plugin version that added the endpoints below. */
const MIN_VERSION = "1.3.0";

export interface DynamicTag {
  /** With braces, e.g. {acf_price}. */
  name: string;
  label: string;
  group: string;
  /** wp, acf, metabox, jetengine, pods, toolset, cmb2, woo… */
  provider: string | null;
  field_type: string | null;
}

export const getDynamicTags = (site: Site) =>
  helperRequest<{ tags: DynamicTag[] }>(site, "/dynamic-tags", {}, { minVersion: MIN_VERSION }).then((r) => r.tags);

export interface ShortPost {
  id: number;
  title: string;
  type_label: string;
  status: string;
  link: string;
  builder_url: string;
}

export interface ElementMatch {
  /** "element", "label", "id", "class", or a setting path like "_typography › color › raw". */
  field: string;
  text: string;
}

export interface ElementResult {
  /** Null for elements inside a global component. */
  post: ShortPost | null;
  component: string | null;
  area: "content" | "header" | "footer" | "component";
  element: { id: string; name: string; label: string | null; classes: string[] };
  matches: ElementMatch[];
}

export interface ElementSearch {
  results: ElementResult[];
  total: number;
  /** Every element type used on the site, most used first. */
  element_types: { name: string; count: number }[];
}

export const searchElements = (site: Site, query: string, element: string) =>
  helperRequest<ElementSearch>(
    site,
    "/search",
    { q: query, element },
    { minVersion: MIN_VERSION, timeout: SCAN_TIMEOUT },
  );

/** "text-basic" → "Text Basic". */
export const elementTitle = (name: string) =>
  name.replace(/(^|-)(\w)/g, (_, dash, c) => (dash ? " " : "") + c.toUpperCase());

/** "_typography › color › raw" → "typography › color › raw"; "_cssCustom" → "custom CSS". */
export function fieldLabel(field: string): string {
  return field
    .split(" › ")
    .map((part) => (part === "_cssCustom" ? "custom CSS" : part.replace(/^_/, "")))
    .join(" › ");
}

export interface UnusedClass {
  id: string;
  name: string;
  category: string | null;
  /** False for name-only classes, e.g. ones a CSS framework adds so they show up in the class picker. */
  has_styles: boolean;
}

export interface CodeElement {
  post: ShortPost;
  element: { id: string; label: string | null };
  /** Runs PHP on the server. */
  executes: boolean;
  signature: "valid" | "invalid" | "missing" | "unknown" | null;
  languages: string[];
}

export type ImageIssue = "missing_alt" | "filename_alt" | "large" | "oversized" | "old_format" | "broken";
export type ImageKind = "image" | "gallery" | "background" | "inline";

export interface ImageUsage {
  post: ShortPost | null;
  component: string | null;
  element_id: string;
  label: string | null;
  kind: ImageKind;
  /** Image size Bricks serves (thumbnail, medium, large, full…); null for <img> tags. */
  size: string | null;
  /** The element (or <img> tag) has its own alt text. Always true for backgrounds, which need none. */
  own_alt: boolean;
  /** Background set on a breakpoint or state, e.g. "mobile_portrait" or "hover". */
  breakpoint?: string | null;
  /** Dynamic data tag that resolved to this image, e.g. {featured_image}. */
  tag?: string;
}

export interface AuditImage {
  key: string;
  /** Media library id; null for images referenced only by URL. */
  id: number | null;
  url: string;
  preview: string;
  filename: string;
  title: string | null;
  caption: string | null;
  mime: string | null;
  width: number | null;
  height: number | null;
  filesize: number | null;
  /** The largest file Bricks serves for it. */
  served: { size: string; width: number; height: number; filesize: number | null } | null;
  /** Alt text in the media library. */
  alt: string | null;
  decorative: boolean;
  can_edit: boolean;
  issues: ImageIssue[];
  /** Where missing alt text is fixed: in the media library, or in Bricks (URL images, <img> tags). */
  alt_fix: "library" | "bricks" | null;
  usages: ImageUsage[];
  usage_count: number;
  /** In the media library but not used in Bricks. */
  unused: boolean;
  /** A media library id the elements point to that doesn't exist on this site. */
  missing_id: number | null;
}

export interface DynamicImage {
  post: ShortPost | null;
  component: string | null;
  element_id: string;
  label: string | null;
  kind: ImageKind;
  tag: string;
  own_alt: boolean;
}

export interface ImageAudit {
  images: AuditImage[];
  dynamic: DynamicImage[];
  unused_library_total: number;
  thresholds: { large_bytes: number; oversized_width: number };
}

export interface ImageSummary {
  used: number;
  missing_alt: number;
  filename_alt: number;
  large: number;
  oversized: number;
  old_format: number;
  broken: number;
  dynamic: number;
  unused_library: number;
}

export interface Audit {
  unused_classes: UnusedClass[];
  class_trash: { id: string; name: string; deleted_at: number | null }[];
  templates_without_conditions: (ShortPost & { template_type: string })[];
  code_elements: CodeElement[];
  code_execution_enabled: boolean | null;
  /** Missing when the audit came from a plugin build before the image audit. */
  images?: ImageSummary;
  heavy_pages: { post: ShortPost; elements: number }[];
  /** Administrators can trash and restore classes. */
  can_manage: boolean;
}

/** Served images above `largeKb` count as large. */
export const getAudit = (site: Site, largeKb: number) =>
  helperRequest<Audit>(
    site,
    "/audit",
    { large_kb: String(largeKb) },
    { minVersion: MIN_VERSION, timeout: SCAN_TIMEOUT },
  );

export const trashClasses = (site: Site, ids: string[]) =>
  helperRequest<{ trashed: { id: string; name: string }[]; skipped: string[] }>(
    site,
    "/audit/trash-classes",
    {},
    { method: "POST", body: { ids }, minVersion: MIN_VERSION },
  );

export const restoreClasses = (site: Site, ids: string[]) =>
  helperRequest<{ restored: { id: string; name: string }[] }>(
    site,
    "/audit/restore-classes",
    {},
    { method: "POST", body: { ids }, minVersion: MIN_VERSION },
  );

export const getImageAudit = (site: Site, largeKb: number) =>
  helperRequest<ImageAudit>(
    site,
    "/audit/images",
    { large_kb: String(largeKb) },
    { minVersion: MIN_VERSION, timeout: SCAN_TIMEOUT },
  );

/** The Large Image Threshold preference of Bricks Site Audit, in KB. */
export function largeImageKb(): number {
  const value = parseInt(getPreferenceValues<Preferences.SiteAudit>().largeImageKb ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 300;
}

/** Saves alt text in the media library, or marks the image decorative (empty alt on purpose). */
export const setAltText = (site: Site, attachmentId: number, alt: string, decorative = false) =>
  helperRequest<{ id: number; alt: string; decorative: boolean }>(
    site,
    `/attachment/${attachmentId}/alt`,
    {},
    { method: "POST", body: { alt, decorative }, minVersion: MIN_VERSION },
  );

export interface OutlineLine {
  depth: number;
  name: string;
  label: string | null;
  /** A component instance. */
  component: boolean;
}

export interface LibraryTemplate {
  id: number;
  title: string;
  template_type: string | null;
  status: string;
  modified_gmt: string;
  builder_url: string;
  link: string;
  elements: number;
  outline: OutlineLine[];
}

export interface LibraryComponent {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  properties: number;
  elements: number;
  outline: OutlineLine[];
}

export const getLibrary = (site: Site) =>
  helperRequest<{ templates: LibraryTemplate[]; components: LibraryComponent[] }>(
    site,
    "/library",
    {},
    { minVersion: MIN_VERSION, timeout: SCAN_TIMEOUT },
  );

/** Bricks clipboard JSON (what ⌘C in the builder copies) for a template or a component instance. */
export async function getLibraryClipboard(site: Site, kind: "template" | "component", id: string | number) {
  const data = await helperRequest<unknown>(
    site,
    `/library/${kind}/${id}`,
    {},
    { minVersion: MIN_VERSION, timeout: SCAN_TIMEOUT },
  );
  return JSON.stringify(data);
}

/** Markdown tree of an outline, e.g. "- **Hero** (section)". */
export function outlineMarkdown(outline: OutlineLine[], total: number): string {
  const lines = outline.map((line) => {
    const name = escapeMarkdown(line.component ? `${elementTitle(line.name)} component` : line.name);
    return `${"  ".repeat(line.depth)}- ${line.label ? `**${escapeMarkdown(line.label)}** (${name})` : name}`;
  });
  const more = total > outline.length ? `\n\n…and ${total - outline.length} more elements` : "";
  return lines.join("\n") + more;
}

export interface FormSummary {
  form_id: string;
  name: string;
  post: ShortPost | null;
  count: number;
  latest_id: number;
  latest_at: string;
}

export interface Submission {
  id: number;
  form_id: string;
  form_name: string;
  post: ShortPost | null;
  created_at: string;
  fields: { id: string; label: string; type: string; value: string }[];
  /** First valid email field, for replying. */
  email: string | null;
  browser: string | null;
  os: string | null;
  ip: string | null;
  referrer: string | null;
  user: string | null;
}

const FORMS_VERSION = "1.4.0";

export const getForms = (site: Site) =>
  helperRequest<{ table_exists: boolean; forms: FormSummary[]; total: number; max_id: number }>(
    site,
    "/forms",
    {},
    { minVersion: FORMS_VERSION },
  );

export const getSubmissions = (
  site: Site,
  params: { formId?: string; afterId?: number; page?: number; perPage?: number },
) =>
  helperRequest<{ submissions: Submission[]; total: number; max_id: number }>(
    site,
    "/forms/submissions",
    {
      form_id: params.formId ?? "",
      after_id: String(params.afterId ?? 0),
      page: String(params.page ?? 1),
      per_page: String(params.perPage ?? 50),
    },
    { minVersion: FORMS_VERSION },
  );

export const deleteSubmissions = (site: Site, ids: number[]) =>
  helperRequest<{ deleted: number }>(
    site,
    "/forms/submissions/delete",
    {},
    { method: "POST", body: { ids }, minVersion: FORMS_VERSION },
  );

/** A readable title for a submission: a name field, else the email, else the first value. */
export function submissionTitle(submission: Submission): string {
  const named = submission.fields.find((f) => /name/i.test(`${f.id} ${f.label}`) && f.value && f.type !== "email");
  const first = submission.fields.find((f) => f.value && !["hidden", "file"].includes(f.type));
  return (named?.value ?? submission.email ?? first?.value ?? `Submission #${submission.id}`).slice(0, 80);
}

/** The helper plugin version this extension ships with; older sites are flagged in Bricks Site Health. */
export const HELPER_VERSION = "1.6.0";

export interface SiteHealth {
  site_name: string;
  home_url: string;
  wp_version: string;
  /** The server details below are null for users who can't manage the site. */
  php_version: string | null;
  db_version: string | null;
  bricks_version: string | null;
  theme: string;
  plugin_version: string;
  css_loading: string | null;
  /** "" when off. */
  maintenance_mode: "" | "maintenance" | "comingSoon";
  code_execution_enabled: boolean | null;
  debug: boolean | null;
  environment: string | null;
  multisite: boolean | null;
  search_engines_blocked: boolean;
  /** Null when the user can't update plugins. */
  updates: {
    core: string | null;
    plugins: { name: string; current: string | null; new: string }[];
    themes: { name: string; slug: string; current: string | null; new: string }[];
    checked_at: string | null;
  } | null;
  can_manage: boolean;
  /** Helper 1.6 and later. */
  license?: LicenseSummary;
}

export const getHealth = (site: Site) => helperRequest<SiteHealth>(site, "/health", {}, { minVersion: FORMS_VERSION });

/** -1, 0 or 1, comparing dotted version numbers. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = b.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}
