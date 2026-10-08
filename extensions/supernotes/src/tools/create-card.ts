import { superfetch } from "~/api/superfetch";
import { getSupernotesPrefs } from "~/utils/helpers";

type Input = {
  /**
   * The name of the card to create that the user has provided. If they do not provide a name then generate one from the content they provided, required.
   */
  name: string;

  /**
   * The content of the card in markdown format. If the user does not provide content then ask for it, required.
   */
  content: string;

  /**
   * If the user wants to create a card as a child of other cards, then search for the ids of the parent cards and provide them here, optional.
   */
  parentIds?: string[];
};

/**
 * Creates a new card
 * @param input The input to the tool
 */
export default async function ({ name, content, parentIds }: Input) {
  const { apiKey } = getSupernotesPrefs();
  const fetched = await superfetch("/v1/cards/simple", "post", {
    apiKey,
    body: {
      name,
      markup: content,
      parent_ids: parentIds,
    },
  });

  if (!fetched.ok) {
    throw new Error(`There was a problem creating the card: ${fetched.body.detail}`);
  }

  return fetched.body;
}
