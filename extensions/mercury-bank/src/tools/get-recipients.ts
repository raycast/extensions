import { getApiClient } from "../lib/accounts";

export default async function GetRecipients() {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };
  try {
    const recipients = await api.getRecipients();
    return recipients.map((r) => ({
      id: r.id,
      name: r.name,
      nickname: r.nickname,
      status: r.status,
      emails: r.emails,
      defaultPaymentMethod: r.defaultPaymentMethod,
      dateLastPaid: r.dateLastPaid,
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}