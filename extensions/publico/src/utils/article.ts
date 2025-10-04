import { Color, Icon, Image } from "@raycast/api";
import { Article, TagLike } from "../api/type";

const FALLBACK_URL = "https://www.publico.pt";
const TAG_COLORS: Color.ColorLike[] = [
  "#B22222",
  "#4B0082",
  "#006400",
  "#8B4513",
  "#4682B4",
  "#800080",
  "#FF8C00",
  "#2F4F4F",
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

export function formatAuthors(autores: Article["autores"]): string {
  if (!autores) {
    return "Not available";
  }

  if (Array.isArray(autores)) {
    const authorNames = autores
      .filter((author) => author && (typeof author === "string" || author.nome))
      .map((author) => (typeof author === "string" ? author : author.nome));

    return authorNames.length > 0 ? authorNames.join(", ") : "Not available";
  }

  if (typeof autores === "object" && autores !== null) {
    if ("nome" in autores) {
      return autores.nome as string;
    }

    if ("name" in autores && typeof autores.name === "string") {
      return autores.name;
    }
  }

  if (typeof autores === "string") {
    return autores;
  }

  return "Not available";
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
