import { api, Paginated } from "./client";
import { Project } from "./projects";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  membership_level: number | null;
};

export type OrganizationDetail = Organization & {
  members_count?: number;
  available_features?: string[];
};

export function listOrganizations(signal?: AbortSignal) {
  return api.get<Paginated<Organization>>("organizations", signal);
}

export function getOrganization(orgId: string, signal?: AbortSignal) {
  return api.get<OrganizationDetail>(`organizations/${orgId}`, signal);
}

export function listOrganizationProjects(orgId: string, signal?: AbortSignal) {
  return api.get<Paginated<Project>>(`organizations/${orgId}/projects`, signal);
}

export function getCurrentUser(signal?: AbortSignal) {
  return api.get<{
    distinct_id: string;
    email: string;
    organization: { id: string; name: string } | null;
    organizations: Array<{ id: string; name: string }>;
    team: { id: number; name: string } | null;
  }>("users/@me", signal);
}
