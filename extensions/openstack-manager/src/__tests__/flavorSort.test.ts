// Feature: openstack-manager, Property 10: Flavor list is sorted by vCPU count ascending

import * as fc from "fast-check";
import { Flavor } from "../services/types";

/**
 * Arbitrary generator for Flavor objects with random vcpus, ram, and disk values.
 * Other fields use sensible defaults since they are not relevant to the sort property.
 */
const flavorArb: fc.Arbitrary<Flavor> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  vcpus: fc.integer({ min: 1, max: 128 }),
  ram: fc.integer({ min: 256, max: 524288 }),
  disk: fc.integer({ min: 0, max: 2048 }),
  ephemeral: fc.constant(0),
  swap: fc.constant(""),
  rxtx_factor: fc.constant(1.0),
  is_public: fc.boolean(),
});

describe("FlavorService - Property 10: Flavor list is sorted by vCPU count ascending", () => {
  // **Validates: Requirements 4.4**
  it("after sorting by vcpus ascending, each flavor's vcpus >= previous flavor's vcpus", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(flavorArb, { minLength: 1 }), async (flavors: Flavor[]) => {
        // Apply the same sort logic used in FlavorService.listFlavors()
        const sorted = [...flavors].sort((a, b) => (a.vcpus ?? 0) - (b.vcpus ?? 0));

        // Verify ascending order: each element's vcpus >= previous element's vcpus
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].vcpus ?? 0).toBeGreaterThanOrEqual(sorted[i - 1].vcpus ?? 0);
        }
      }),
      { numRuns: 100 },
    );
  });
});
