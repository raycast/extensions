import { describe, expect, it, vi } from "vitest";

import type { CleanupProvider } from "../types";
import { providers, scanAll } from "./index";

describe("provider orchestration", () => {
  it("publishes progressive results and isolates provider failures", async () => {
    const original = [...providers];
    const success: CleanupProvider = {
      id: "projects",
      scan: async () => ({
        candidates: [
          {
            id: "candidate",
            providerId: "projects",
            section: "Projects",
            title: "candidate",
            subtitle: "candidate",
            description: "candidate",
            cleanupPolicy: "trash",
            risk: "safe",
            selectedByDefault: true,
            bytes: 10,
          },
        ],
        issues: [],
      }),
    };
    const failure: CleanupProvider = { id: "docker", scan: async () => Promise.reject(new Error("offline")) };
    providers.splice(0, providers.length, success, failure);
    const progress = vi.fn();
    try {
      const result = await scanAll({ homeDirectory: "/tmp", projectRoots: [] }, progress);
      expect(result.candidates).toHaveLength(1);
      expect(result.issues).toEqual([{ providerId: "docker", message: "offline" }]);
      expect(progress).toHaveBeenCalledTimes(2);
      expect(progress.mock.calls.at(-1)?.slice(1)).toEqual([2, 2]);
    } finally {
      providers.splice(0, providers.length, ...original);
    }
  });
});
