import { getObjectDisplayTitle } from "./display-title";
import { getObjectSubtitle, getObjectTypeLabel, getObjectUrl } from "./helpers";
import { MainEntity, MyMindObject } from "./types";

export type DetailAssets = {
  blobUrl?: string;
  screenshotUrl?: string;
  thumbnailUrl?: string;
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

function getHeroImage(item: MyMindObject, assets: DetailAssets): string | undefined {
  if (item.blob?.type?.startsWith("image/")) {
    return assets.blobUrl ?? assets.thumbnailUrl;
  }

  if (item.blob?.type?.startsWith("video/") || item.blob?.type === "application/pdf") {
    return assets.thumbnailUrl ?? assets.screenshotUrl;
  }

  if (getObjectUrl(item)) {
    return assets.screenshotUrl ?? assets.thumbnailUrl;
  }

  return undefined;
}

function buildEntitySection(item: MyMindObject): string | undefined {
  const entityName = getMainEntityDisplayName(item.mainEntity);
  const entityTypes = getMainEntityTypeNames(item.mainEntity);
  const entityDescription = item.mainEntity?.description?.trim();
  const lines = [entityName ? `**${entityName}**` : undefined, entityTypes.join(" • ") || undefined, entityDescription].filter(
    Boolean,
  );

  if (lines.length === 0) {
    return undefined;
  }

  return ["## Main Entity", lines.join("\n\n")].join("\n\n");
}

function buildNotesSection(item: MyMindObject): string | undefined {
  const noteBodies = getObjectNoteBodies(item);

  if (noteBodies.length === 0) {
    return undefined;
  }

  return ["## Notes", noteBodies.join("\n\n---\n\n")].join("\n\n");
}

export function getObjectDetailMarkdown(item: MyMindObject, assets: DetailAssets): string {
  const title = getObjectDisplayTitle(item);
  const subtitle = getObjectSubtitle(item);
  const heroImage = getHeroImage(item, assets);
  const body = getObjectBody(item);
  const entitySection = buildEntitySection(item);
  const notesSection = buildNotesSection(item);
  const sections = [`# ${title}`];

  if (heroImage) {
    sections.push(`![](${heroImage})`);
  }

  const shouldShowSubtitleInBody = !heroImage && !item.blob?.type;

  if (subtitle && shouldShowSubtitleInBody) {
    sections.push(subtitle);
  }

  if (body) {
    sections.push(body);
  }

  if (!body && !item.summary) {
    sections.push(`Saved as a ${getObjectTypeLabel(item).toLowerCase()} in mymind.`);
  }

  if (entitySection) {
    sections.push(entitySection);
  }

  if (notesSection) {
    sections.push(notesSection);
  }

  return sections.join("\n\n");
}
