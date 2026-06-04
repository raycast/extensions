import { type SubmissionDraft } from "./feed";

export type SubmissionFormValues = {
  category: string;
  title: string;
  slug?: string;
  sourceUrl: string;
  brandName?: string;
  brandDomain?: string;
  description?: string;
  tags?: string[];
};

export const commonSubmissionTags = [
  "agent",
  "automation",
  "claude",
  "claude-code",
  "config",
  "developer-tools",
  "docs",
  "mcp",
  "productivity",
  "prompting",
  "security",
  "workflow",
];

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeDomain(value?: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

export function isValidHttpsUrl(value?: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidDomain(value?: string) {
  const normalized = normalizeDomain(value);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
    normalized,
  );
}

export function normalizeSubmissionDraft(
  values: SubmissionFormValues,
): SubmissionDraft {
  const title = values.title.trim();
  return {
    category: values.category,
    title,
    slug: values.slug?.trim() || slugify(title),
    sourceUrl: values.sourceUrl.trim(),
    brandName: String(values.brandName || "").trim(),
    brandDomain: normalizeDomain(values.brandDomain),
    description: String(values.description || "").trim(),
    tags: [...new Set(values.tags || [])].sort(),
  };
}

export function buildSubmissionDraftText(draft: SubmissionDraft) {
  return [
    `Category: ${draft.category || ""}`,
    `Name: ${draft.title || ""}`,
    `Slug: ${draft.slug || ""}`,
    `Source or docs URL: ${draft.sourceUrl || ""}`,
    `Brand name: ${draft.brandName || ""}`,
    `Brand domain: ${draft.brandDomain || ""}`,
    `Description: ${draft.description || ""}`,
    `Tags: ${Array.isArray(draft.tags) ? draft.tags.join(", ") : draft.tags || ""}`,
  ].join("\n");
}
