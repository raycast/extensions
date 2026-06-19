import { Color, Icon, Image } from "@raycast/api";
import { formatDate } from "./formatDate";
import { Article, TagLike } from "../api/type";

export const FALLBACK_URL = "https://www.publico.pt";
export const DEFAULT_METADATA_PLACEHOLDER = "Not available";
export const UNKNOWN_DATE_PLACEHOLDER = DEFAULT_METADATA_PLACEHOLDER;
export const INVALID_DATE_PREFIX = "0001-01-01";
const TAG_COLORS: Color.ColorLike[] = [
  Color.Red,
  Color.Purple,
  Color.Green,
  Color.Orange,
  Color.Blue,
  Color.Magenta,
  Color.Yellow,
];

export function getArticleUrl(article: Article): string {
  if (article.fullUrl) {
    return article.fullUrl;
  }

  if (!article.url) {
    return FALLBACK_URL;
  }

  let fixedUrl = article.url;
  fixedUrl = fixedUrl.replace("https://www.publico.pthttps//", "https://");
  fixedUrl = fixedUrl.replace("https://www.publico.pthttps/", "https://");
  fixedUrl = fixedUrl.replace("https//", "https://");

  if (!fixedUrl.includes("publico.pt") && !fixedUrl.startsWith("http")) {
    const prefix = fixedUrl.startsWith("/") ? "" : "/";
    fixedUrl = `${FALLBACK_URL}${prefix}${fixedUrl}`;
  }

  return fixedUrl;
}

export function resolvePublishedDate(article: Article): string {
  const timestamp = article.data ?? article.time ?? "";

  if (!timestamp) {
    return UNKNOWN_DATE_PLACEHOLDER;
  }

  if (timestamp.includes(INVALID_DATE_PREFIX)) {
    return UNKNOWN_DATE_PLACEHOLDER;
  }

  return formatDate(timestamp);
}

export function cleanDescription(description?: string): string {
  if (!description) {
    return "";
  }

  const patterns = [
    /^(há|hÃ¡)\s+\d+\s+(horas?|dias?|semanas?|meses?)(?:\s*\.{3}|\s+\.\.\.|…)\s*/i,
    /^h[aá]\s+\d+\s+(?:horas?|dias?|semanas?|meses?)(?:\s*\.{3}|\s+\.\.\.|…)\s*/i,
  ];

  let cleanedDesc = description;
  for (const pattern of patterns) {
    const match = cleanedDesc.match(pattern);
    if (match) {
      cleanedDesc = cleanedDesc.substring(match[0].length);
      break;
    }
  }

  return cleanedDesc;
}

type AuthorLike = string | { nome?: string; name?: string } | undefined | null;

function extractAuthorName(author: AuthorLike): string | null {
  if (typeof author === "string") {
    return author;
  }

  if (author && typeof author === "object") {
    if (author.nome && typeof author.nome === "string") {
      return author.nome;
    }

    if (author.name && typeof author.name === "string") {
      return author.name;
    }
  }

  return null;
}

export function formatAuthors(autores: Article["autores"]): string {
  if (!autores) {
    return DEFAULT_METADATA_PLACEHOLDER;
  }

  if (Array.isArray(autores)) {
    const authorNames = autores
      .map((author) => extractAuthorName(author as AuthorLike))
      .filter((name): name is string => Boolean(name));

    return authorNames.length > 0
      ? authorNames.join(", ")
      : DEFAULT_METADATA_PLACEHOLDER;
  }

  const singleAuthor = extractAuthorName(autores as AuthorLike);
  if (singleAuthor) {
    return singleAuthor;
  }

  return DEFAULT_METADATA_PLACEHOLDER;
}

type TagObject = {
  nome?: string;
  name?: string;
  value?: string;
  titulo?: string;
  title?: string;
  toString?: () => string;
};

function isTagObject(tag: TagLike | undefined): tag is TagObject {
  return Boolean(tag) && typeof tag === "object";
}

function normalizeTag(tag: TagLike | undefined): string {
  if (typeof tag === "string") {
    return tag;
  }

  if (!isTagObject(tag)) {
    return "";
  }

  const candidate =
    tag.nome || tag.name || tag.value || tag.titulo || tag.title;

  if (candidate) {
    return candidate;
  }

  if (typeof tag.toString === "function") {
    const text = tag.toString();
    if (text !== "[object Object]") {
      return text;
    }
  }

  return "";
}

export function extractTags(tags: Article["tags"]): string[] {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags
      .map((tag) => normalizeTag(tag as TagLike))
      .filter(
        (tag) =>
          Boolean(tag) &&
          tag !== "undefined" &&
          tag !== "null" &&
          tag !== "[object Object]",
      );
  }

  const normalized = normalizeTag(tags as TagLike);
  return normalized ? [normalized] : [];
}

export function getTagColor(index: number): Color.ColorLike {
  return TAG_COLORS[index % TAG_COLORS.length];
}

export function getArticleIcon(article: Article): Image.ImageLike {
  if (
    article.multimediaPrincipal &&
    typeof article.multimediaPrincipal === "string"
  ) {
    return { source: article.multimediaPrincipal };
  }

  if (
    article.multimediaPrincipal &&
    typeof article.multimediaPrincipal === "object" &&
    "src" in article.multimediaPrincipal &&
    article.multimediaPrincipal.src
  ) {
    return { source: article.multimediaPrincipal.src as string };
  }

  if (
    article.imagem &&
    typeof article.imagem === "object" &&
    article.imagem.src
  ) {
    return { source: article.imagem.src };
  }

  return { source: Icon.Globe, tintColor: "#1E90FF" };
}
