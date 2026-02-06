import { getApiClient } from "../lib/accounts";

export default async function GetCategories() {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };
  try {
    return await api.getCategories();
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}