import { afterAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_ORCA_PATH, OrcaCliError, parseEnvelope, resolveOrcaPath, runOrca } from "../src/lib/orca-cli";

const readFixture = (name: string): string => readFileSync(join(__dirname, "fixtures", name), "utf8");

// Capture l'erreur levée par un appel synchrone pour inspecter son code
const catchError = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
};

describe("parseEnvelope", () => {
  test("parseEnvelope returns result on ok", () => {
    const result = parseEnvelope<{ outcome: { sessionId: string } }>(readFixture("agent-launch.json"));
    expect(result.outcome.sessionId).toBe("d9359b2d-b91a-4794-8475-6948bcd54004");
  });

  test("parseEnvelope throws OrcaCliError with Orca code", () => {
    const error = catchError(() => parseEnvelope(readFixture("error-invalid-id.json")));
    expect(error).toBeInstanceOf(OrcaCliError);
    expect((error as OrcaCliError).code).toBe("agent_invalid_id");
    expect((error as OrcaCliError).message.startsWith("7 is not an Orca session ID")).toBe(true);
  });

  test("parseEnvelope throws invalid_output on empty or non-JSON", () => {
    for (const stdout of ["", "Segmentation fault"]) {
      const error = catchError(() => parseEnvelope(stdout));
      expect(error).toBeInstanceOf(OrcaCliError);
      expect((error as OrcaCliError).code).toBe("invalid_output");
    }
  });

  test("parseEnvelope throws invalid_output when JSON is not an envelope", () => {
    for (const stdout of ["null", "42", '{"hello":"world"}', "[]"]) {
      const error = catchError(() => parseEnvelope(stdout));
      expect(error).toBeInstanceOf(OrcaCliError);
      expect((error as OrcaCliError).code).toBe("invalid_output");
    }
  });
});

describe("resolveOrcaPath", () => {
  test("resolveOrcaPath falls back to default", () => {
    expect(resolveOrcaPath(undefined)).toBe(DEFAULT_ORCA_PATH);
    expect(resolveOrcaPath("")).toBe(DEFAULT_ORCA_PATH);
    expect(resolveOrcaPath("  ")).toBe(DEFAULT_ORCA_PATH);
    expect(resolveOrcaPath("/x/orca")).toBe("/x/orca");
  });
});

const scriptDir = mkdtempSync(join(tmpdir(), "orca-cli-test-"));
afterAll(() => rmSync(scriptDir, { recursive: true, force: true }));

// Crée un faux binaire Orca exécutable à partir d'un corps de script shell
const makeFakeOrca = (name: string, body: string): string => {
  const path = join(scriptDir, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
};

const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (caught: unknown) => caught,
  );

describe("runOrca", () => {
  test("runOrca reports binary_not_found", async () => {
    const error = await rejectionOf(runOrca(["status"], { orcaPath: "/nonexistent/orca" }));
    expect(error).toBeInstanceOf(OrcaCliError);
    expect((error as OrcaCliError).code).toBe("binary_not_found");
  });

  test("runOrca reports binary_not_found for a file that is not executable", async () => {
    const path = join(scriptDir, "not-executable");
    writeFileSync(path, "#!/bin/sh\nexit 0\n");
    chmodSync(path, 0o644);
    const error = await rejectionOf(runOrca(["status"], { orcaPath: path }));
    expect(error).toBeInstanceOf(OrcaCliError);
    expect((error as OrcaCliError).code).toBe("binary_not_found");
  });

  test("runOrca reports binary_not_found when the path is a directory", async () => {
    const error = await rejectionOf(runOrca(["status"], { orcaPath: scriptDir }));
    expect(error).toBeInstanceOf(OrcaCliError);
    expect((error as OrcaCliError).code).toBe("binary_not_found");
  });

  test("runOrca appends --json and returns the envelope result", async () => {
    const orcaPath = makeFakeOrca("echo-args", `printf '{"ok":true,"result":{"args":"%s"}}' "$*"`);
    const result = await runOrca<{ args: string }>(["bot", "list"], { orcaPath });
    expect(result.args).toBe("bot list --json");
  });

  test("runOrca surfaces the Orca error envelope written on a non-zero exit", async () => {
    const orcaPath = makeFakeOrca(
      "fail-envelope",
      `printf '{"ok":false,"error":{"code":"agent_invalid_id","message":"nope"}}'\nexit 1`,
    );
    const error = await rejectionOf(runOrca(["agent", "show", "7"], { orcaPath }));
    expect(error).toBeInstanceOf(OrcaCliError);
    expect((error as OrcaCliError).code).toBe("agent_invalid_id");
  });

  test("runOrca reports invalid_output on a crash without JSON", async () => {
    const orcaPath = makeFakeOrca("crash", `echo "Segmentation fault" >&2\nexit 139`);
    const error = await rejectionOf(runOrca(["status"], { orcaPath }));
    expect(error).toBeInstanceOf(OrcaCliError);
    expect((error as OrcaCliError).code).toBe("invalid_output");
  });

  test("runOrca reports invalid_output on empty stdout with exit 0", async () => {
    const orcaPath = makeFakeOrca("silent", "exit 0");
    const error = await rejectionOf(runOrca(["status"], { orcaPath }));
    expect((error as OrcaCliError).code).toBe("invalid_output");
  });

  test("runOrca reports timeout when the binary hangs", async () => {
    const orcaPath = makeFakeOrca("hang", "sleep 5");
    const error = await rejectionOf(runOrca(["status"], { orcaPath, timeoutMs: 200 }));
    expect(error).toBeInstanceOf(OrcaCliError);
    expect((error as OrcaCliError).code).toBe("timeout");
  });
});
