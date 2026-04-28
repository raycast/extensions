// Feature: openstack-manager, Property 9: Status color mapping is total and consistent for all resource types
// **Validates: Requirements 3.8, 5.4, 8.5**

import fc from "fast-check";
import { Color } from "@raycast/api";
import { getServerStatusColor, getImageStatusColor, getClusterStatusColor } from "../utils/statusColors";

/** All valid Color values that the mapping functions may return. */
const VALID_COLORS = new Set<string>([
  Color.Green as string,
  Color.Red as string,
  Color.Orange as string,
  Color.SecondaryText as string,
]);

describe("Property 9: Status color mapping is total and consistent", () => {
  describe("getServerStatusColor", () => {
    it("returns a non-null color for any status string and is deterministic", () => {
      fc.assert(
        fc.property(fc.string(), (status) => {
          const color1 = getServerStatusColor(status);
          const color2 = getServerStatusColor(status);

          // Total: always returns a defined, non-null value
          expect(color1).toBeDefined();
          expect(color1).not.toBeNull();
          expect(VALID_COLORS.has(color1)).toBe(true);

          // Consistent: same input always produces same output
          expect(color1).toBe(color2);
        }),
        { numRuns: 100 },
      );
    });

    it("maps known statuses to the correct colors", () => {
      expect(getServerStatusColor("ACTIVE")).toBe(Color.Green);
      expect(getServerStatusColor("ERROR")).toBe(Color.Red);
      expect(getServerStatusColor("BUILD")).toBe(Color.Orange);
      expect(getServerStatusColor("SHUTOFF")).toBe(Color.Orange);
      expect(getServerStatusColor("REBOOT")).toBe(Color.Orange);
      expect(getServerStatusColor("HARD_REBOOT")).toBe(Color.Orange);
      expect(getServerStatusColor("UNKNOWN_STATUS")).toBe(Color.SecondaryText);
    });
  });

  describe("getImageStatusColor", () => {
    it("returns a non-null color for any status string and is deterministic", () => {
      fc.assert(
        fc.property(fc.string(), (status) => {
          const color1 = getImageStatusColor(status);
          const color2 = getImageStatusColor(status);

          expect(color1).toBeDefined();
          expect(color1).not.toBeNull();
          expect(VALID_COLORS.has(color1)).toBe(true);

          expect(color1).toBe(color2);
        }),
        { numRuns: 100 },
      );
    });

    it("maps known statuses to the correct colors", () => {
      expect(getImageStatusColor("active")).toBe(Color.Green);
      expect(getImageStatusColor("killed")).toBe(Color.Red);
      expect(getImageStatusColor("deactivated")).toBe(Color.Red);
      expect(getImageStatusColor("queued")).toBe(Color.Orange);
      expect(getImageStatusColor("saving")).toBe(Color.Orange);
      expect(getImageStatusColor("something_else")).toBe(Color.SecondaryText);
    });
  });

  describe("getClusterStatusColor", () => {
    it("returns a non-null color for any status string and is deterministic", () => {
      fc.assert(
        fc.property(fc.string(), (status) => {
          const color1 = getClusterStatusColor(status);
          const color2 = getClusterStatusColor(status);

          expect(color1).toBeDefined();
          expect(color1).not.toBeNull();
          expect(VALID_COLORS.has(color1)).toBe(true);

          expect(color1).toBe(color2);
        }),
        { numRuns: 100 },
      );
    });

    it("maps known statuses to the correct colors", () => {
      expect(getClusterStatusColor("CREATE_COMPLETE")).toBe(Color.Green);
      expect(getClusterStatusColor("UPDATE_COMPLETE")).toBe(Color.Green);
      expect(getClusterStatusColor("CREATE_FAILED")).toBe(Color.Red);
      expect(getClusterStatusColor("DELETE_FAILED")).toBe(Color.Red);
      expect(getClusterStatusColor("CREATE_IN_PROGRESS")).toBe(Color.Orange);
      expect(getClusterStatusColor("UPDATE_IN_PROGRESS")).toBe(Color.Orange);
      expect(getClusterStatusColor("DELETE_IN_PROGRESS")).toBe(Color.Orange);
      expect(getClusterStatusColor("RANDOM_STATUS")).toBe(Color.SecondaryText);
    });
  });
});
