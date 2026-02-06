import { getApiClient } from "../lib/accounts";

export default async function GetCards() {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };
  try {
    const cards = await api.getAllCards();
    return cards.map((c) => ({
      cardId: c.cardId,
      nameOnCard: c.nameOnCard,
      lastFourDigits: c.lastFourDigits,
      network: c.network,
      status: c.status,
      physicalCardStatus: c.physicalCardStatus,
      createdAt: c.createdAt,
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}