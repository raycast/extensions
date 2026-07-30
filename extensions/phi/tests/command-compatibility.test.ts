import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const phi = vi.hoisted(() => ({
  requirePhiVersion: vi.fn(),
}));

vi.mock("../src/phi", () => ({
  MINIMUM_PHI_VERSION: "2.4.0",
  requirePhiVersion: phi.requirePhiVersion,
}));

import {
  PHI_COMMAND_REQUIREMENTS,
  runPhiAction,
  runPhiCommand,
} from "../src/command-compatibility";
import { currentPhiInvocationContext } from "../src/invocation-context";

describe("Phi command compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    phi.requirePhiVersion.mockResolvedValue({
      apiVersion: 1,
      version: "2.4.0",
      build: "1",
    });
  });

  it("defines a minimum Phi version for every manifest command", () => {
    const manifest = JSON.parse(
      readFileSync("package.json", "utf8"),
    ) as { commands: { name: string }[] };

    expect(Object.keys(PHI_COMMAND_REQUIREMENTS).sort()).toEqual(
      manifest.commands.map((command) => command.name).sort(),
    );
  });

  it("checks the configured version before running a command", async () => {
    const operation = vi
      .fn()
      .mockImplementation(() => currentPhiInvocationContext());

    await expect(runPhiCommand("new-window", operation)).resolves.toMatchObject(
      {
        schemaVersion: 1,
        clientId: "raycast",
        clientCommand: "new-window",
      },
    );

    expect(phi.requirePhiVersion).toHaveBeenCalledWith("2.4.0");
    expect(operation).toHaveBeenCalledOnce();
    expect(phi.requirePhiVersion.mock.invocationCallOrder[0]).toBeLessThan(
      operation.mock.invocationCallOrder[0] as number,
    );
  });

  it("supports an independent minimum version for an action", async () => {
    const operation = vi
      .fn()
      .mockImplementation(() => currentPhiInvocationContext());

    await expect(
      runPhiAction(
        "phi-actions",
        "add-split-view",
        { minimumPhiVersion: "2.6.0" },
        operation,
      ),
    ).resolves.toMatchObject({
      clientCommand: "phi-actions",
      clientAction: "add-split-view",
    });

    expect(phi.requirePhiVersion).toHaveBeenCalledWith("2.6.0");
    expect(operation).toHaveBeenCalledOnce();
  });

  it("does not run the command when its Phi version is unsupported", async () => {
    const error = new Error("Update Phi");
    phi.requirePhiVersion.mockRejectedValue(error);
    const operation = vi.fn();

    await expect(runPhiCommand("new-window", operation)).rejects.toBe(error);
    expect(operation).not.toHaveBeenCalled();
  });
});
