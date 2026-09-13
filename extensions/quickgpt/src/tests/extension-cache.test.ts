import { Cache } from "@raycast/api";
import { createNamespacedCache } from "../utils/extension-cache";

describe("extension cache namespaces", () => {
  it("migrates legacy values once and then isolates subsequent writes", () => {
    const key = "migration-test-key";
    const legacyCache = new Cache();
    legacyCache.set(key, "legacy-value");

    const namespacedCache = createNamespacedCache("migration-test", [key]);
    expect(namespacedCache.get(key)).toBe("legacy-value");

    namespacedCache.set(key, "namespaced-value");
    expect(legacyCache.get(key)).toBe("legacy-value");
  });
});
