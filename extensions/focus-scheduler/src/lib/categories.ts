export type CategoryOption = {
  id: string;
  title: string;
  /** Built-in Raycast category vs user-created Focus Category */
  kind?: "builtin" | "custom";
  /** Original Raycast categoryId when known from export */
  categoryId?: string;
  /** Hosts from Focus Categories export (used for verification / future fallbacks) */
  websiteHosts?: string[];
  /** Bundle IDs / app ids from export */
  applicationIds?: string[];
};

/**
 * Built-in Raycast Focus categoryIds (from Raycast Focus backend).
 * Deeplink: categories=social,gaming
 */
export const BUILT_IN_CATEGORIES: CategoryOption[] = [
  { id: "social", title: "Social", kind: "builtin" },
  { id: "messaging", title: "Messaging", kind: "builtin" },
  { id: "gaming", title: "Gaming", kind: "builtin" },
  { id: "news", title: "News", kind: "builtin" },
  { id: "shopping", title: "Shopping", kind: "builtin" },
  { id: "streaming", title: "Streaming", kind: "builtin" },
  { id: "travel", title: "Travel", kind: "builtin" },
];

export const WEEKDAYS: { id: string; title: string; value: number }[] = [
  { id: "1", title: "Monday", value: 1 },
  { id: "2", title: "Tuesday", value: 2 },
  { id: "3", title: "Wednesday", value: 3 },
  { id: "4", title: "Thursday", value: 4 },
  { id: "5", title: "Friday", value: 5 },
  { id: "6", title: "Saturday", value: 6 },
  { id: "0", title: "Sunday", value: 0 },
];

const BUILT_IN_IDS = new Set(BUILT_IN_CATEGORIES.map((c) => c.id));

/**
 * Matches Raycast Focus backend slugifyFocusCategoryTitle:
 * `title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")`
 * Empty result becomes `"focus-category"`.
 */
export function slugifyCategory(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "focus-category" : slug;
}

/** Legacy slug used by earlier versions of this extension (accent-stripped). */
export function slugifyCategoryLegacy(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Raycast resolves categoryIds strictly via getByCategoryId.
 * Unresolved IDs are dropped (session still starts).
 * Emit candidates so at least one matches (slug, uniqueness suffixes, legacy).
 */
export function expandCategoryIdsForDeeplink(
  categoryIds: string[],
  known: CategoryOption[] = [],
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (id: string | undefined) => {
    const value = id?.trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    candidates.push(value);
  };

  for (const id of categoryIds) {
    push(id);

    const knownMatch = known.find((c) => c.id === id || c.title === id);
    const title =
      knownMatch?.title ??
      (isBuiltInCategory(id) ? undefined : titleFromSlug(id));

    if (title) {
      const raycastSlug = slugifyCategory(title);
      push(raycastSlug);
      for (let n = 2; n <= 6; n += 1) {
        push(`${raycastSlug}-${n}`);
      }

      const legacy = slugifyCategoryLegacy(title);
      if (legacy && legacy !== raycastSlug) {
        push(legacy);
        for (let n = 2; n <= 4; n += 1) {
          push(`${legacy}-${n}`);
        }
      }
    }
  }

  return candidates;
}

export function parseCustomCategories(input: string): string[] {
  return input
    .split(/[,;\n]/)
    .map((part) => slugifyCategory(part))
    .filter(Boolean);
}

export function categoryTitle(
  id: string,
  custom: CategoryOption[] = [],
): string {
  const builtIn = BUILT_IN_CATEGORIES.find((c) => c.id === id);
  if (builtIn) return builtIn.title;
  const known = custom.find((c) => c.id === id);
  if (known) return known.title;
  return titleFromSlug(id);
}

export function isBuiltInCategory(id: string): boolean {
  return BUILT_IN_IDS.has(id);
}

export function titleFromSlug(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Parse Raycast Focus Categories export / import JSON.
 * Supports:
 * - `[{ "title": "…", "apps"?: [], "websites"?: [] }]`
 * - `{ "focusCategories": [ … ] }` (settings-style export subset)
 * - Raycast Beta shape: `{ title, websiteHosts, applicationIds, icon? }`
 */
export function parseFocusCategoriesExport(raw: string): CategoryOption[] {
  const parsed = JSON.parse(raw) as unknown;
  let items: unknown[] = [];

  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.focusCategories)) {
      items = record.focusCategories;
    } else if (typeof record.title === "string") {
      items = [parsed];
    }
  }

  const result: CategoryOption[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const title =
      typeof record.title === "string"
        ? record.title.trim()
        : typeof record.name === "string"
          ? record.name.trim()
          : "";
    if (!title) continue;

    const id =
      typeof record.categoryId === "string" && record.categoryId.trim()
        ? slugifyCategory(record.categoryId)
        : typeof record.id === "string" && record.id.trim()
          ? slugifyCategory(record.id)
          : slugifyCategory(title);

    if (!id || BUILT_IN_IDS.has(id)) continue;
    const categoryId =
      typeof record.categoryId === "string" && record.categoryId.trim()
        ? record.categoryId.trim()
        : undefined;

    const websiteHosts = normalizeStringList(
      record.websiteHosts ?? record.websites ?? record.hosts,
    );
    const applicationIds = normalizeStringList(
      record.applicationIds ?? record.apps ?? record.bundleIds,
    );

    result.push({
      id,
      title,
      kind: "custom",
      categoryId,
      websiteHosts: websiteHosts.length > 0 ? websiteHosts : undefined,
      applicationIds: applicationIds.length > 0 ? applicationIds : undefined,
    });
  }

  return result;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function mergeCategoryOptions(
  ...groups: CategoryOption[][]
): CategoryOption[] {
  const byId = new Map<string, CategoryOption>();
  for (const group of groups) {
    for (const option of group) {
      const existing = byId.get(option.id);
      if (!existing) {
        byId.set(option.id, option);
        continue;
      }
      byId.set(option.id, {
        ...existing,
        ...option,
        title:
          option.title && option.title !== titleFromSlug(option.id)
            ? option.title
            : existing.title,
        kind:
          option.kind === "custom" || existing.kind === "custom"
            ? "custom"
            : (option.kind ?? existing.kind),
        websiteHosts: option.websiteHosts?.length
          ? option.websiteHosts
          : existing.websiteHosts,
        applicationIds: option.applicationIds?.length
          ? option.applicationIds
          : existing.applicationIds,
      });
    }
  }
  return [...byId.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "custom" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}
