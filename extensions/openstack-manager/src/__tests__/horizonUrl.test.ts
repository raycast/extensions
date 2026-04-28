// Feature: openstack-manager, Property 8: Horizon deep-link construction follows the pattern for all resource types
// **Validates: Requirements 3.6, 6.3, 7.3, 8.3**

import fc from "fast-check";
import { buildHorizonLink, HorizonResourceType } from "../utils/horizonUrl";

/** Maps resource types to their expected Horizon path segments. */
const RESOURCE_PATH_MAP: Record<HorizonResourceType, string> = {
  servers: "compute/instance/detail",
  networks: "network/networks/detail",
  security_groups: "network/security-group/detail",
  clusters: "container-infra/clusters/detail",
};

describe("Property 8: Horizon deep-link construction", () => {
  it("for any non-empty horizon_url and any UUID, the link equals {base}/{path}/{id}", () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.uuid(),
        fc.constantFrom<HorizonResourceType>("servers", "networks", "security_groups", "clusters"),
        (horizonUrl, id, resourceType) => {
          const link = buildHorizonLink(horizonUrl, resourceType, id);

          expect(link).not.toBeNull();

          const base = horizonUrl.replace(/\/+$/, "");
          const path = RESOURCE_PATH_MAP[resourceType];
          const expected = `${base}/${path}/${id}`;

          expect(link).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("returns null when horizonUrl is undefined", () => {
    expect(buildHorizonLink(undefined, "servers", "some-id")).toBeNull();
  });

  it("returns null when horizonUrl is an empty string", () => {
    expect(buildHorizonLink("", "servers", "some-id")).toBeNull();
  });

  it("returns null when horizonUrl is whitespace only", () => {
    expect(buildHorizonLink("   ", "servers", "some-id")).toBeNull();
  });

  it("builds correct URLs for each resource type", () => {
    const base = "https://cloud.example.com";
    expect(buildHorizonLink(base, "servers", "id-1")).toBe(`${base}/compute/instance/detail/id-1`);
    expect(buildHorizonLink(base, "networks", "id-2")).toBe(`${base}/network/networks/detail/id-2`);
    expect(buildHorizonLink(base, "security_groups", "id-3")).toBe(`${base}/network/security-group/detail/id-3`);
    expect(buildHorizonLink(base, "clusters", "id-4")).toBe(`${base}/container-infra/clusters/detail/id-4`);
  });
});
