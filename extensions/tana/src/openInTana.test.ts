import { beforeEach, describe, expect, it, vi } from "vitest";
import { openNodeInTana } from "./openInTana";
import type { TanaMcpClient } from "./api/TanaAPIClient";

const raycast = vi.hoisted(() => ({
  closeMainWindow: vi.fn(async () => undefined),
  open: vi.fn(async () => undefined),
  showToast: vi.fn(async (toast: { style: string; title: string; message?: string }) => ({ ...toast })),
}));

vi.mock("@raycast/api", () => ({
  PopToRootType: { Suspended: "suspended" },
  Toast: { Style: { Animated: "animated", Failure: "failure", Success: "success" } },
  closeMainWindow: raycast.closeMainWindow,
  open: raycast.open,
  showToast: raycast.showToast,
}));

const clientWithOpen = (openNode: TanaMcpClient["openNode"]) => ({ openNode }) as unknown as TanaMcpClient;

describe("openNodeInTana", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the node, activates Tana, and marks the toast successful", async () => {
    const client = clientWithOpen(vi.fn(async () => undefined));

    await openNodeInTana(client, { id: "node", name: "Node" }, "panel");

    expect(client.openNode).toHaveBeenCalledWith("node", "panel");
    expect(raycast.closeMainWindow).toHaveBeenCalledWith({ popToRootType: "suspended" });
    expect(raycast.open).toHaveBeenCalledWith("/Applications/Tana Outliner.app");
    const toast = await raycast.showToast.mock.results[0]?.value;
    expect(toast).toMatchObject({ style: "success", title: "Opened in Tana" });
  });

  it("keeps the open request successful when only app activation fails", async () => {
    const client = clientWithOpen(vi.fn(async () => undefined));
    const activation = vi.fn(async () => {
      throw new Error("activation failed");
    });

    await openNodeInTana(client, { id: "node", name: "Node" }, "current", activation);

    const toast = await raycast.showToast.mock.results[0]?.value;
    expect(toast).toMatchObject({
      style: "success",
      title: "Requested Tana Open",
      message: "Tana accepted the node open, but Raycast could not activate Tana: activation failed",
    });
  });

  it("reports the Local API open failure", async () => {
    const client = clientWithOpen(
      vi.fn(async () => {
        throw new Error("Tana returned HTTP 404");
      }),
    );

    await openNodeInTana(client, { id: "missing", name: "Missing" });

    expect(raycast.open).not.toHaveBeenCalled();
    const toast = await raycast.showToast.mock.results[0]?.value;
    expect(toast).toMatchObject({
      style: "failure",
      title: "Unable to Open in Tana",
      message: "Tana returned HTTP 404",
    });
  });
});
