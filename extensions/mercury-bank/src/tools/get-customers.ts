import { getApiClient } from "../lib/accounts";

export default async function GetCustomers() {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };
  try {
    const customers = await api.getCustomers();
    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}