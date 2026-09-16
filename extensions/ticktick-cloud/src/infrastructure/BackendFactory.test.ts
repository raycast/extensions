import { describe, expect, it, vi } from "vitest";

import type { TickTickBackend } from "./backend/TickTickBackend";
import { selectTickTickBackend, type BackendLoaders } from "./BackendFactory";

describe("selectTickTickBackend", () => {
  it("always selects the single release-approved remote backend", async () => {
    const loaders: BackendLoaders = {
      loadReleaseRemote: vi.fn(async (backendId) => ({ id: backendId } as TickTickBackend)),
    };

    const backend = await selectTickTickBackend(loaders);
    expect(backend.id).toBe("mcp");
    expect(loaders.loadReleaseRemote).toHaveBeenCalledExactlyOnceWith("mcp");
  });
});
