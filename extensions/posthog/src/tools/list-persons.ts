import { listProjectResources, pickProperties } from "../posthog-client";

type Input = {
  accountId?: string;
  projectId?: number;
  search?: string;
  limit?: number;
  /** Comma-separated property keys to include. */
  propertyKeys?: string;
  maxPropertyValueLength?: number;
};

type Person = {
  id?: number;
  uuid?: string;
  name?: string;
  distinct_ids?: string[];
  properties?: Record<string, unknown>;
  created_at?: string;
};

export default async function tool({
  accountId,
  search,
  projectId,
  limit,
  propertyKeys,
  maxPropertyValueLength,
}: Input = {}) {
  const {
    accountId: resolvedAccountId,
    resolvedProjectId,
    response,
  } = await listProjectResources<Person>({
    accountId,
    projectId,
    endpoint: "persons",
    search,
    limit,
    defaultLimit: 25,
    maxLimit: 100,
  });

  return {
    accountId: resolvedAccountId,
    projectId: resolvedProjectId,
    count: response.count,
    next: response.next,
    persons: (response.results ?? []).map((person) => ({
      id: person.id,
      uuid: person.uuid,
      name: person.name,
      distinctIds: person.distinct_ids?.slice(0, 10),
      createdAt: person.created_at,
      properties: pickProperties(
        person.properties,
        propertyKeys
          ?.split(",")
          .map((key) => key.trim())
          .filter(Boolean),
        maxPropertyValueLength,
      ),
    })),
  };
}
