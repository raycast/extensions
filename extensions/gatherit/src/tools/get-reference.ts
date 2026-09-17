import { getReference } from "../lib/api";

type Input = {
  /** The Gather reference id to fetch. */
  id: string;
};

/** Fetch a single Gather reference by id with its full metadata. */
export default async function tool(input: Input) {
  const ref = await getReference(input.id);
  return {
    id: ref.id,
    title: ref.title,
    description: ref.description,
    tags: ref.tags,
    elements: ref.elements,
    categories: ref.categories,
    sourceUrl: ref.sourceUrl,
    domain: ref.domain,
    imageUrl: ref.imageUrl,
  };
}
