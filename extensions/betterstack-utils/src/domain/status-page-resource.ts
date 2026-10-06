import { StatusPageSection } from "@/domain/status-page-section";

export const ResourceStatus = {
  OPERATIONAL: "operational",
  DEGRADED: "degraded",
  DOWNTIME: "downtime",
  MAINTENANCE: "maintenance",
  NOT_MONITORED: "not_monitored",
} as const;

export type ResourceStatus = (typeof ResourceStatus)[keyof typeof ResourceStatus];

export interface StatusHistoryDay {
  day: string;
  status: ResourceStatus;
}

export interface StatusPageResource {
  id: string;
  sectionId: string;
  position: number;
  name: string;
  status: ResourceStatus;
  availability: number;
  history: StatusHistoryDay[];
}

export interface StatusPageSectionGroup {
  id: string;
  name: string;
  resources: StatusPageResource[];
}

const UNGROUPED_SECTION_ID = "ungrouped";
const UNGROUPED_SECTION_NAME = "Other";

export function groupResourcesBySection(
  sections: StatusPageSection[],
  resources: StatusPageResource[],
): StatusPageSectionGroup[] {
  const knownSectionIds = new Set(sections.map((section) => section.id));
  const resourcesBySectionId = new Map<string, StatusPageResource[]>();

  resources.forEach((resource) => {
    const bucket = resourcesBySectionId.get(resource.sectionId) ?? [];
    bucket.push(resource);
    resourcesBySectionId.set(resource.sectionId, bucket);
  });

  const groups = [...sections]
    .sort((a, b) => a.position - b.position)
    .map((section) => ({
      id: section.id,
      name: section.name,
      resources: (resourcesBySectionId.get(section.id) ?? []).sort((a, b) => a.position - b.position),
    }))
    .filter((group) => group.resources.length > 0);

  const ungroupedResources = resources
    .filter((resource) => !knownSectionIds.has(resource.sectionId))
    .sort((a, b) => a.position - b.position);

  if (ungroupedResources.length > 0) {
    groups.push({ id: UNGROUPED_SECTION_ID, name: UNGROUPED_SECTION_NAME, resources: ungroupedResources });
  }

  return groups;
}
