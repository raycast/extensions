import { beforeEach, describe, expect, it, vi } from "vitest";
import { Cache } from "./mocks/raycast-api";
import type { Capabilities } from "../src/helpers/work-item-backends";

const mocks = vi.hoisted(() => ({
  capabilities: { v2: false } as Capabilities,
  listProjectWorkItemsRaw: vi.fn(),
  planeRequest: vi.fn(),
  invalidateBackend: vi.fn(),
}));

vi.mock("../src/api/auth", () => ({
  requirePlaneClient: () => ({ workspaceSlug: "ws" }),
  getCurrentAccessToken: () => "token",
}));
vi.mock("../src/api/projects", () => ({
  getAllProjects: async () => [],
  getMemberProjects: async () => [
    { id: "p1", identifier: "ONE", name: "One" },
    { id: "p2", identifier: "TWO", name: "Two" },
  ],
}));
vi.mock("../src/api/users", () => ({ getCurrentUser: async () => ({ id: "me" }) }));
vi.mock("../src/api/work-items", () => ({
  WORK_ITEM_SCAN_FIELDS: "id,name",
  listProjectWorkItemsRaw: mocks.listProjectWorkItemsRaw,
}));
vi.mock("../src/api/request", () => ({
  planeRequest: mocks.planeRequest,
  planeRequestV2: vi.fn(),
  workspacePath: (path: string) => `workspaces/ws/${path}`,
}));
vi.mock("../src/api/work-item-backend", () => ({
  getCapabilities: async () => mocks.capabilities,
  invalidateBackend: mocks.invalidateBackend,
}));

const { getMyWorkItems } = await import("../src/api/my-work-items");

const store = new Cache({ namespace: "plane-my-work-items" });
const leaseKeys = () => [...Cache.stores.get("plane-my-work-items")!.keys()].filter((key) => key.endsWith("|lease"));

describe("My Work Items project scan", () => {
  let leasesSeen: string[][];

  beforeEach(() => {
    Cache.stores.get("plane-my-work-items")?.clear();
    leasesSeen = [];
    mocks.capabilities = { v2: false };
    mocks.invalidateBackend.mockReset();
    mocks.planeRequest.mockReset();
    mocks.listProjectWorkItemsRaw.mockReset();
    mocks.listProjectWorkItemsRaw.mockImplementation(async ({ projectId }: { projectId: string }) => {
      leasesSeen.push(leaseKeys());
      return {
        results: [
          { id: `${projectId}-a`, name: "Mine", sequence_id: 1, project: projectId, assignees: ["me"] },
          { id: `${projectId}-c`, name: "Filed", sequence_id: 2, project: projectId, created_by: "me" },
        ],
        next_page_results: false,
      };
    });
  });

  it("runs one scan for Assigned and Created loading together, and filters each view from it", async () => {
    const [assigned, created] = await Promise.all([getMyWorkItems("assigned"), getMyWorkItems("created")]);
    expect(mocks.listProjectWorkItemsRaw).toHaveBeenCalledTimes(2); // one page per project, once
    expect(assigned.items.map((item) => item.id)).toEqual(["p1-a", "p2-a"]);
    expect(created.items.map((item) => item.id)).toEqual(["p1-c", "p2-c"]);
    // Both views scan under the one lease for the server, workspace and account.
    expect(new Set(leasesSeen.flat()).size).toBe(1);
    expect(leasesSeen.every((keys) => keys.length === 1 && keys[0].endsWith("|scan|lease"))).toBe(true);
  });

  it("takes the scan lease when the server filters fall back to the scan", async () => {
    mocks.capabilities = { v2: false, custom: { params: ["assignees"] } };
    mocks.planeRequest.mockRejectedValue(Object.assign(new Error("Not found"), { status: 404 }));

    const result = await getMyWorkItems("assigned");
    expect(result.backend).toBe("scan");
    expect(mocks.invalidateBackend).toHaveBeenCalledWith("custom");
    expect(leasesSeen.length).toBeGreaterThan(0);
    expect(leasesSeen.every((keys) => keys.length === 1 && keys[0].endsWith("|scan|lease"))).toBe(true);
    expect(leaseKeys()).toEqual([]);
    expect(store.get(leasesSeen[0][0].replace(/\|lease$/, ""))).toBeDefined();
  });
});
