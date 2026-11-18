import { getObjectDisplayTitle } from "./display-title";
import { getObjectKind } from "./object-kind";
import { MainEntity, MyMindObject } from "./types";

export type DetailAssets = {
  blobUrl?: string;
  screenshotUrl?: string;
  thumbnailUrl?: string;
  linkPreviewImageUrl?: string;
};

export function getMainEntityDisplayName(entity?: MainEntity): string | undefined {
  return (
    entity?.name?.trim() ||
    entity?.headline?.trim() ||
    entity?.title?.trim() ||
    entity?.description?.trim() ||
    entity?.["@id"]?.trim()
  );
}

export function getMainEntityTypeNames(entity?: MainEntity): string[] {
  const value = entity?.["@type"];

  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

export function getObjectBody(item: MyMindObject): string | undefined {
  const body = typeof item.content?.body === "string" ? item.content.body.trim() : "";
  return body || undefined;
}

export function getObjectNoteBodies(item: MyMindObject): string[] {
  return (item.notes ?? [])
    .map((note) => (typeof note.content?.body === "string" ? note.content.body.trim() : ""))
    .filter(Boolean);
}

function isWebPageLike(item: MyMindObject): boolean {
  const value = item.mainEntity?.["@type"];

  if (!value) {
    return false;
  }

  const types = Array.isArray(value) ? value : [value];
  return types.includes("WebPage");
}

function getHeroImage(item: MyMindObject, assets: DetailAssets): string | undefined {
  const kind = getObjectKind(item);

  if (kind === "image") {
    return assets.blobUrl ?? assets.thumbnailUrl;
  }

  if (kind === "video" || kind === "pdf") {
    return assets.thumbnailUrl ?? assets.screenshotUrl;
  }

  if (kind === "link") {
    return assets.linkPreviewImageUrl ?? assets.thumbnailUrl ?? assets.screenshotUrl;
  }

  if (kind === "saved-item" && isWebPageLike(item)) {
    return assets.linkPreviewImageUrl ?? assets.thumbnailUrl ?? assets.screenshotUrl;
  }

  return undefined;
}

function buildNotesSection(item: MyMindObject): string | undefined {
  const noteBodies = getObjectNoteBodies(item);

  if (noteBodies.length === 0) {
    return undefined;
  }

  return ["## Notes", noteBodies.join("\n\n---\n\n")].join("\n\n");
}

function buildSummarySection(item: MyMindObject): string | undefined {
  const summary = item.summary?.trim();

  if (!summary) {
    return undefined;
  }

  return summary;
}

export function getObjectDetailMarkdown(item: MyMindObject, assets: DetailAssets): string {
  const title = getObjectDisplayTitle(item);
  const heroImage = getHeroImage(item, assets);
  const body = getObjectBody(item);
  const summarySection = buildSummarySection(item);
  const notesSection = buildNotesSection(item);
  const sections = [`# ${title}`];

  if (summarySection) {
    sections.push(summarySection);
  }

  if (heroImage) {
    sections.push(`![](${heroImage})`);
  }

  if (body) {
    sections.push(body);
  }

  if (notesSection) {
    sections.push(notesSection);
  }

  return sections.join("\n\n");
}
