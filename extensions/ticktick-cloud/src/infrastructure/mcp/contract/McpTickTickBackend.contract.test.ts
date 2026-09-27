import { describe, expect, it } from "vitest";
import { ApiTokenAuthProvider } from "../../auth/ApiTokenAuthProvider";
import { createMcpClient } from "../createMcpClient";
import { readContractEnvironment } from "./contractResult";
import { createFileLockStore, runMcpContract } from "./runMcpContract";

describe("authenticated TickTick MCP contract", () => {
  it("proves the locked structured task lifecycle and removes its disposable task", async () => {
    const environment = readContractEnvironment(process.env);
    const auth = new ApiTokenAuthProvider("mcp", () => ({ apiToken: environment.token }));

    const result = await runMcpContract({
      createClient: () => createMcpClient(auth),
      sourceProjectId: environment.sourceProjectId,
      targetProjectId: environment.targetProjectId,
      lockStore: createFileLockStore(),
    });

    expect(result).toMatchObject({
      eligible: true,
      inboxProven: true,
      snapshotComplete: true,
      cleanupSucceeded: true,
      syntheticOnly: false,
    });
    expect(result.firstUncachedResponseMs).toBeLessThanOrEqual(2_000);
    console.info(JSON.stringify(result));
  });
});
