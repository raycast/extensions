import { getSnippet } from "../lib/snipper-helper";

type Input = {
  /** The snippet id (UUID). */
  id: string;
};

export default async function tool(input: Input) {
  const snippet = await getSnippet(input.id);
  if (!snippet) return { error: "Snippet not found" };
  return {
    id: snippet.id,
    title: snippet.title,
    language: snippet.language,
    content: snippet.content,
    isFavorite: snippet.isFavorite,
    hubUrl: snippet.hubUrl,
  };
}
