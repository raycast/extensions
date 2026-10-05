import { describe, expect, it } from "vitest";
import { groupResourcesBySection, ResourceStatus, StatusPageResource } from "@/domain/status-page-resource";
import { StatusPageSection } from "@/domain/status-page-section";

function resource(overrides: Partial<StatusPageResource>): StatusPageResource {
  return {
    id: "1",
    sectionId: "10",
    position: 0,
    name: "API",
    status: ResourceStatus.OPERATIONAL,
    availability: 99.99,
    history: [],
    ...overrides,
  };
}

describe("groupResourcesBySection", () => {
  const sections: StatusPageSection[] = [
    { id: "20", name: "EU datacenter", position: 1 },
    { id: "10", name: "Core services", position: 0 },
  ];

  it("orders sections by position and resources within a section by position", () => {
    const resources = [
      resource({ id: "1", sectionId: "10", position: 1, name: "Second" }),
      resource({ id: "2", sectionId: "10", position: 0, name: "First" }),
      resource({ id: "3", sectionId: "20", position: 0, name: "EU API" }),
    ];

    const groups = groupResourcesBySection(sections, resources);

    expect(groups.map((group) => group.name)).toEqual(["Core services", "EU datacenter"]);
    expect(groups[0].resources.map((r) => r.name)).toEqual(["First", "Second"]);
    expect(groups[1].resources.map((r) => r.name)).toEqual(["EU API"]);
  });

  it("drops a section that ends up with no resources", () => {
    const resources = [resource({ id: "1", sectionId: "10" })];

    const groups = groupResourcesBySection(sections, resources);

    expect(groups.map((group) => group.id)).toEqual(["10"]);
  });

  it("puts resources whose section id doesn't match any known section into an 'Other' group", () => {
    const resources = [resource({ id: "1", sectionId: "999" })];

    const groups = groupResourcesBySection(sections, resources);

    expect(groups).toEqual([{ id: "ungrouped", name: "Other", resources: [resources[0]] }]);
  });
});
