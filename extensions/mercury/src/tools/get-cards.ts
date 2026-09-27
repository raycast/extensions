import { loadEachLogin } from "../logins";
import { getCards } from "../mercury";

type Input = {
  /**
   * Only return cards with this status, e.g. "active" or "frozen". Omit for all cards.
   */
  status?: "active" | "frozen" | "cancelled" | "inactive" | "expired" | "suspended";
};

/**
 * Retrieves Mercury debit and credit cards for every connected Mercury account.
 * Never includes full card numbers or CVCs. Organizations that couldn't be reached are listed in
 * `unavailable`.
 */
export default async function (input: Input = {}) {
  const { results, unavailable } = await loadEachLogin(async (login) =>
    (await getCards(login.token)).map((card) => ({ organization: login.name, ...card })),
  );
  const cards = results.flatMap(({ value }) => value);
  return { cards: input.status ? cards.filter((card) => card.status === input.status) : cards, unavailable };
}
