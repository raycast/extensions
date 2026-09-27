import { requireLogins } from "../logins";
import { getCards } from "../mercury";

type Input = {
  /**
   * Only return cards with this status, e.g. "active" or "frozen". Omit for all cards.
   */
  status?: "active" | "frozen" | "cancelled" | "inactive" | "expired" | "suspended";
};

/**
 * Retrieves Mercury debit and credit cards for every connected Mercury account.
 * Never includes full card numbers or CVCs.
 */
export default async function (input: Input = {}) {
  const logins = await requireLogins();
  const results = await Promise.all(
    logins.map(async (login) => (await getCards(login.token)).map((card) => ({ organization: login.name, ...card }))),
  );
  const cards = results.flat();
  return input.status ? cards.filter((card) => card.status === input.status) : cards;
}
