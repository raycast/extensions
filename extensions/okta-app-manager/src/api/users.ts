import { adminBaseUrl, oktaFetch } from "./client";

export function adminUserUrl(userId: string): string {
  return `${adminBaseUrl()}/admin/user/profile/view/${encodeURIComponent(userId)}`;
}

export type OktaUser = {
  id: string;
  status: string;
  created: string;
  activated: string | null;
  statusChanged: string | null;
  lastLogin: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: Record<string, any>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateUser(userId: string, profile: Record<string, any>): Promise<OktaUser> {
  return (await oktaFetch(`/api/v1/users/${encodeURIComponent(userId)}`, {
    method: "POST", // Partial update
    body: JSON.stringify({ profile }),
  })) as OktaUser;
}

export async function searchUsers(query: string): Promise<OktaUser[]> {
  const q = encodeURIComponent(query);
  const path = `/api/v1/users?q=${q}&limit=50`;
  const data = await oktaFetch(path);
  if (!Array.isArray(data)) return [];
  return data as OktaUser[];
}

export async function getUser(userId: string): Promise<OktaUser> {
  return (await oktaFetch(`/api/v1/users/${encodeURIComponent(userId)}`)) as OktaUser;
}
