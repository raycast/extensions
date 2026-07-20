import { adminBaseUrl, oktaFetch } from "./client";

export function adminGroupUrl(groupId: string): string {
  return `${adminBaseUrl()}/admin/group/${encodeURIComponent(groupId)}`;
}

export type OktaGroup = {
  id: string;
  created: string;
  lastUpdated: string;
  lastMembershipUpdated: string;
  objectClass: string[];
  type: string;
  profile: {
    name: string;
    description: string | null;
  };
};

export async function searchGroups(query: string): Promise<OktaGroup[]> {
  const q = encodeURIComponent(query);
  const path = `/api/v1/groups?q=${q}&limit=50`;
  const data = await oktaFetch(path);
  if (!Array.isArray(data)) return [];
  return data as OktaGroup[];
}

export async function getGroup(groupId: string): Promise<OktaGroup> {
  return (await oktaFetch(`/api/v1/groups/${encodeURIComponent(groupId)}`)) as OktaGroup;
}

export async function updateGroup(
  groupId: string,
  profile: { name: string; description?: string },
): Promise<OktaGroup> {
  return (await oktaFetch(`/api/v1/groups/${encodeURIComponent(groupId)}`, {
    method: "PUT",
    body: JSON.stringify({ profile }),
  })) as OktaGroup;
}
