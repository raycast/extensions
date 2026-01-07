import { describe, it, expect } from "vitest";
import { getProvider, savvycalProvider, calcomProvider } from "../index";

describe("provider factory", () => {
  describe("getProvider", () => {
    it("returns savvycal provider for 'savvycal'", () => {
      const provider = getProvider("savvycal");
      expect(provider).toBe(savvycalProvider);
      expect(provider.name).toBe("SavvyCal");
    });

    it("returns calcom provider for 'calcom'", () => {
      const provider = getProvider("calcom");
      expect(provider).toBe(calcomProvider);
      expect(provider.name).toBe("Cal.com");
    });

    it("throws error for unknown provider", () => {
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(() => getProvider("unknown")).toThrow("Unknown provider: unknown");
    });
  });

  describe("exported providers", () => {
    it("exports savvycalProvider", () => {
      expect(savvycalProvider).toBeDefined();
      expect(savvycalProvider.name).toBe("SavvyCal");
    });

    it("exports calcomProvider", () => {
      expect(calcomProvider).toBeDefined();
      expect(calcomProvider.name).toBe("Cal.com");
    });
  });
});
