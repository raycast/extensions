import { Tool } from "@raycast/api";
import { saveArticle, updateArticle } from "../lib/api";
import { asUrl } from "../lib/logic";
import { compactArticle, requireSession } from "../lib/tool";

type Input = {
  /** The address of the page to save. */
  url: string;
  /** Tags to add to the article. */
  tags?: string[];
};

/**
 * Saves a web page to the user's Texthyper library. The text is extracted
 * in the background, so status is "pending" at first. Saving a URL that is
 * already there returns the article that was saved before.
 */
export default async function tool(input: Input) {
  await requireSession();
  const url = asUrl(input.url);
  if (!url) throw new Error(`"${input.url}" is not a URL that can be saved`);

  const { article, created } = await saveArticle({ url });
  const tags = (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  const saved = tags.length
    ? await updateArticle(article.id, { tags: [...new Set([...article.tags, ...tags])] })
    : article;
  return { ...compactArticle(saved), already_saved: !created };
}

// Saving changes the library, so Raycast asks first, naming what is saved.
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tags = (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  return {
    message: "Save this page to Texthyper?",
    info: [
      { name: "URL", value: asUrl(input.url) ?? input.url },
      ...(tags.length ? [{ name: "Tags", value: tags.join(", ") }] : []),
    ],
  };
};
