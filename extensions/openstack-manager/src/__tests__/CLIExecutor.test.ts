// Feature: openstack-manager, Property 7: CLI commands always include the --os-cloud flag

import * as fc from "fast-check";

// Create a jest.fn() that captures calls and returns a resolved promise
const mockExecFile = jest.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_file: string, _args: string[], _options: unknown): Promise<{ stdout: string; stderr: string }> => {
    return Promise.resolve({ stdout: JSON.stringify({ ok: true }), stderr: "" });
  },
);

// Mock util.promisify to return our mock when called with execFile
jest.mock("util", () => {
  const originalUtil = jest.requireActual("util");
  return {
    ...originalUtil,
    promisify: (_fn: unknown) => mockExecFile, // eslint-disable-line @typescript-eslint/no-unused-vars
  };
});

// Import CLIExecutor and error types after the mock is set up
import { CLIExecutor } from "../core/CLIExecutor";
import { CLIError, BinaryNotFoundError } from "../core/errors";

describe("CLIExecutor - Property 7: CLI commands always include the --os-cloud flag", () => {
  beforeEach(() => {
    mockExecFile.mockClear();
  });

  // **Validates: Requirements 2.1**
  it("run() always passes --os-cloud <configName> as the first two arguments", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.array(fc.string()),
        async (configName: string, args: string[]) => {
          mockExecFile.mockClear();

          const executor = new CLIExecutor("openstack", configName);
          await executor.run(args);

          expect(mockExecFile).toHaveBeenCalledTimes(1);
          const passedArgs: string[] = mockExecFile.mock.calls[0][1];
          expect(passedArgs[0]).toBe("--os-cloud");
          expect(passedArgs[1]).toBe(configName);
        },
      ),
      { numRuns: 100 },
    );
  });

  // **Validates: Requirements 2.1**
  it("exec() always passes --os-cloud <configName> as the first two arguments", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.array(fc.string()),
        async (configName: string, args: string[]) => {
          mockExecFile.mockClear();

          const executor = new CLIExecutor("openstack", configName);
          await executor.exec(args);

          expect(mockExecFile).toHaveBeenCalledTimes(1);
          const passedArgs: string[] = mockExecFile.mock.calls[0][1];
          expect(passedArgs[0]).toBe("--os-cloud");
          expect(passedArgs[1]).toBe(configName);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("CLIExecutor - Unit Tests", () => {
  let executor: CLIExecutor;

  beforeEach(() => {
    mockExecFile.mockClear();
    executor = new CLIExecutor("openstack", "my-cloud");
  });

  // Validates: Requirements 11.2
  describe("ENOENT (binary not found)", () => {
    it("run() throws BinaryNotFoundError when binary is not found", async () => {
      const enoentError = new Error("spawn openstack ENOENT") as Error & {
        code: string;
        stderr: string;
        stdout: string;
      };
      enoentError.code = "ENOENT";
      enoentError.stderr = "";
      enoentError.stdout = "";
      mockExecFile.mockRejectedValueOnce(enoentError);

      try {
        await executor.run(["server", "list"]);
        fail("Expected BinaryNotFoundError to be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(BinaryNotFoundError);
        expect((e as BinaryNotFoundError).message).toContain("openstack CLI binary not found");
        expect((e as BinaryNotFoundError).message).toContain("pip install python-openstackclient");
      }
    });

    it("exec() throws BinaryNotFoundError when binary is not found", async () => {
      const enoentError = new Error("spawn openstack ENOENT") as Error & {
        code: string;
        stderr: string;
        stdout: string;
      };
      enoentError.code = "ENOENT";
      enoentError.stderr = "";
      enoentError.stdout = "";
      mockExecFile.mockRejectedValueOnce(enoentError);

      await expect(executor.exec(["server", "start", "abc"])).rejects.toThrow(BinaryNotFoundError);
    });
  });

  // Validates: Requirements 11.1
  describe("Non-zero exit code", () => {
    it("run() throws CLIError with stderr on non-zero exit code", async () => {
      const execError = new Error("Command failed") as Error & {
        code: number;
        stderr: string;
        stdout: string;
      };
      execError.code = 1;
      execError.stderr = "ERROR: No server with a name or ID of 'missing' exists.";
      execError.stdout = "";
      mockExecFile.mockRejectedValueOnce(execError);

      try {
        await executor.run(["server", "show", "missing"]);
        fail("Expected CLIError to be thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(CLIError);
        expect((e as CLIError).message).toContain("No server with a name or ID of 'missing' exists.");
        expect((e as CLIError).stderr).toContain("No server with a name or ID of 'missing' exists.");
      }
    });

    it("exec() throws CLIError with stderr on non-zero exit code", async () => {
      const execError = new Error("Command failed") as Error & {
        code: number;
        stderr: string;
        stdout: string;
      };
      execError.code = 2;
      execError.stderr = "ERROR: Unable to stop server 'xyz'";
      execError.stdout = "";
      mockExecFile.mockRejectedValueOnce(execError);

      await expect(executor.exec(["server", "stop", "xyz"])).rejects.toThrow(CLIError);
    });
  });

  // Validates: Requirements 11.1
  describe("Invalid JSON stdout", () => {
    it("run() throws CLIError when stdout is not valid JSON", async () => {
      mockExecFile.mockResolvedValueOnce({
        stdout: "not json at all",
        stderr: "",
      });

      await expect(executor.run(["server", "list"])).rejects.toThrow(CLIError);
      try {
        mockExecFile.mockResolvedValueOnce({
          stdout: "not json at all",
          stderr: "",
        });
        await executor.run(["server", "list"]);
      } catch (e) {
        expect(e).toBeInstanceOf(CLIError);
        expect((e as CLIError).message).toContain("Failed to parse JSON output");
        expect((e as CLIError).message).toContain("not json at all");
      }
    });

    it("run() throws CLIError when stdout contains partial/malformed JSON", async () => {
      mockExecFile.mockResolvedValueOnce({
        stdout: '{"servers": [',
        stderr: "",
      });

      await expect(executor.run(["server", "list"])).rejects.toThrow(CLIError);
    });
  });

  // Validates: Requirements 11.1
  describe("Successful JSON parse", () => {
    it("run() returns parsed typed data on valid JSON stdout", async () => {
      const serverData = [
        { id: "abc-123", name: "web-server", status: "ACTIVE" },
        { id: "def-456", name: "db-server", status: "SHUTOFF" },
      ];
      mockExecFile.mockResolvedValueOnce({
        stdout: JSON.stringify(serverData),
        stderr: "",
      });

      const result = await executor.run<Array<{ id: string; name: string; status: string }>>(["server", "list"]);

      expect(result).toEqual(serverData);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("web-server");
    });

    it("run() returns empty array for empty JSON array stdout", async () => {
      mockExecFile.mockResolvedValueOnce({
        stdout: JSON.stringify([]),
        stderr: "",
      });

      const result = await executor.run<unknown[]>(["server", "list"]);
      expect(result).toEqual([]);
    });

    it("run() returns parsed object for single resource", async () => {
      const server = {
        id: "abc-123",
        name: "web-server",
        status: "ACTIVE",
        flavor: "m1.small",
      };
      mockExecFile.mockResolvedValueOnce({
        stdout: JSON.stringify(server),
        stderr: "",
      });

      const result = await executor.run<{
        id: string;
        name: string;
        status: string;
        flavor: string;
      }>(["server", "show", "abc-123"]);

      expect(result).toEqual(server);
      expect(result.flavor).toBe("m1.small");
    });
  });

  // Validates: Requirements 11.2
  describe("Timeout behavior", () => {
    it("run() passes default timeout (30s) to execFile", async () => {
      mockExecFile.mockResolvedValueOnce({
        stdout: JSON.stringify([]),
        stderr: "",
      });

      await executor.run(["server", "list"]);

      expect(mockExecFile).toHaveBeenCalledTimes(1);
      const options = mockExecFile.mock.calls[0][2] as { timeout: number };
      expect(options.timeout).toBe(30_000);
    });

    it("run() passes custom timeout to execFile", async () => {
      mockExecFile.mockResolvedValueOnce({
        stdout: JSON.stringify([]),
        stderr: "",
      });

      await executor.run(["server", "list"], { timeoutMs: 60_000 });

      const options = mockExecFile.mock.calls[0][2] as { timeout: number };
      expect(options.timeout).toBe(60_000);
    });

    it("exec() passes default timeout (30s) to execFile", async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: "", stderr: "" });

      await executor.exec(["server", "start", "abc"]);

      const options = mockExecFile.mock.calls[0][2] as { timeout: number };
      expect(options.timeout).toBe(30_000);
    });

    it("exec() passes custom timeout to execFile", async () => {
      mockExecFile.mockResolvedValueOnce({ stdout: "", stderr: "" });

      await executor.exec(["server", "start", "abc"], { timeoutMs: 10_000 });

      const options = mockExecFile.mock.calls[0][2] as { timeout: number };
      expect(options.timeout).toBe(10_000);
    });
  });
});
