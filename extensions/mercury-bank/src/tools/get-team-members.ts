import { getApiClient } from "../lib/accounts";

export default async function GetTeamMembers() {
  const api = await getApiClient();
  if (!api) return { error: "No Mercury account configured" };
  try {
    const members = await api.getTeamMembers();
    return members.map((m) => ({
      id: m.id,
      email: m.email,
      role: m.role,
      status: m.status,
      createdAt: m.createdAt,
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      return { error: "Your API key does not have access to this feature" };
    }
    throw error;
  }
}