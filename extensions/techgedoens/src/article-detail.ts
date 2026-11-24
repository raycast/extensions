import type { Article } from "./articles";
import { translateCategory, type Strings } from "./strings";

type DetailArticle = Article & {
  isFavorite?: boolean;
};

export function createArticleDetailMarkdown(
  article: DetailArticle,
  dateFormatter: Intl.DateTimeFormat,
  translations: Strings,
): string {
  const content = article.contentMarkdown ?? article.excerpt ?? translations.noTextAvailable;
  const { introduction, body } = separateIntroduction(content, article.excerpt);
  const metadata = [
    dateFormatter.format(article.publishedAt),
    article.categories[0] ? translateCategory(article.categories[0]) : undefined,
    article.isFavorite ? `★ ${translations.readLater}` : undefined,
  ].filter(Boolean);
  const sections = [`# ${escapeMarkdown(article.title)}`, `_${escapeMarkdown(metadata.join(" · "))}_`];

  if (introduction) {
    sections.push(toBlockquote(introduction));
  }

  if (body) {
    sections.push("---", body);
  }

  return sections.join("\n\n");
}

function separateIntroduction(content: string, excerpt: string | undefined): { introduction?: string; body: string } {
  const trimmedContent = content.trim();
  const trimmedExcerpt = excerpt?.trim();

  if (!trimmedExcerpt || !trimmedContent.startsWith(trimmedExcerpt)) {
    return { body: trimmedContent };
  }

  const body = trimmedContent
    .slice(trimmedExcerpt.length)
    .replace(/^\s*(?:-{3,}|_{3,}|\*{3,})\s*/, "")
    .trim();

  return { introduction: trimmedExcerpt, body };
}

function toBlockquote(value: string): string {
  return escapeMarkdown(value)
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_[\]])/g, "\\$1");
}
