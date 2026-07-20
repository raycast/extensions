import { strict as assert } from "node:assert";
import {
  ApplePwCliError,
  buildAuthResponseArgs,
  createApplePwClient,
  resolveApplePwBinaryCandidates,
  sanitizeLoggedArgs,
} from "../applepw";
import { test } from "./test-harness";

test("preserves auth-required output for listPasswords", async () => {
  const client = createApplePwClient({
    runner: async () => ({
      stdout: "Enter PIN:",
      stderr: "",
      exitCode: null,
      signal: null,
    }),
    binaryPath: "/bin/applepw",
  });

  const result = await client.listPasswords("example.com");

  assert.equal(result.kind, "auth-required");
  assert.equal(result.prompt, "Enter PIN:");
});

test("listPasswords exposes successful payload", async () => {
  const client = createApplePwClient({
    runner: async () => ({
      stdout: JSON.stringify({
        results: [
          {
            id: "1",
            username: "alice@example.com",
            domain: "example.com",
            password: "secret",
            has_otp: true,
          },
        ],
        status: 0,
      }),
      stderr: "",
      exitCode: 0,
      signal: null,
    }),
    binaryPath: "/bin/applepw",
  });

  const result = await client.listPasswords("example.com");

  assert.equal(result.kind, "success");
  assert.deepEqual(result.payload, [
    {
      id: "1",
      username: "alice@example.com",
      domain: "example.com",
      password: "secret",
      has_otp: true,
    },
  ]);
});

test("listPasswords normalizes object-shaped results into an array", async () => {
  const client = createApplePwClient({
    runner: async () => ({
      stdout: JSON.stringify({
        results: {
          "entry-1": {
            id: "entry-1",
            username: "alice@example.com",
            domain: "example.com",
            code: "123456",
          },
        },
        status: 0,
      }),
      stderr: "",
      exitCode: 0,
      signal: null,
    }),
    binaryPath: "/bin/applepw",
  });

  const result = await client.listPasswords("example.com");

  assert.equal(result.kind, "success");
  assert.deepEqual(result.payload, [
    {
      id: "entry-1",
      username: "alice@example.com",
      domain: "example.com",
      code: "123456",
    },
  ]);
});

test("getOtp preserves auth-required output", async () => {
  const client = createApplePwClient({
    runner: async () => ({
      stdout: "",
      stderr: "Enter PIN:",
      exitCode: null,
      signal: null,
    }),
    binaryPath: "/bin/applepw",
  });

  const result = await client.getOtp("example.com");

  assert.equal(result.kind, "auth-required");
  assert.equal(result.prompt, "Enter PIN:");
});

test("surfaces CLI errors", async () => {
  const client = createApplePwClient({
    runner: async () => ({
      stdout: "",
      stderr: JSON.stringify({
        error: "missing daemon",
        status: 1,
        results: [],
      }),
      exitCode: 1,
      signal: null,
    }),
    binaryPath: "/bin/applepw",
  });

  await assert.rejects(
    client.getOtp("example.com"),
    (error: unknown) =>
      error instanceof ApplePwCliError && error.exitCode === 1 && error.stderr.includes("missing daemon"),
  );
});

test("resolveApplePwBinaryCandidates prefers explicit override then env then PATH", () => {
  assert.deepEqual(
    resolveApplePwBinaryCandidates({
      binaryPath: "/custom/applepw",
      env: {
        APPLEPW_BINARY_PATH: "/env/applepw",
      },
    }),
    ["/custom/applepw"],
  );

  assert.deepEqual(
    resolveApplePwBinaryCandidates({
      env: {
        APPLEPW_BINARY_PATH: "/env/applepw",
      },
    }),
    ["/env/applepw"],
  );

  const candidates = resolveApplePwBinaryCandidates({ env: {} });
  assert.equal(candidates[0], "applepw");
  assert.equal(candidates.includes("/opt/homebrew/bin/applepw"), true);
  assert.equal(candidates.includes("/usr/local/bin/applepw"), true);
});

test("builds auth response arguments correctly", () => {
  const args = buildAuthResponseArgs(
    {
      salt: "salt-value",
      serverKey: "server-key-value",
      username: "user@example.com",
      clientKey: "client-key-value",
    },
    "123456",
  );

  assert.deepEqual(args, [
    "auth",
    "response",
    "--pin",
    "123456",
    "--salt",
    "salt-value",
    "--server-key",
    "server-key-value",
    "--client-key",
    "client-key-value",
    "--username",
    "user@example.com",
  ]);
});

test("sanitizeLoggedArgs redacts pin values", () => {
  assert.deepEqual(sanitizeLoggedArgs(["auth", "response", "--pin", "123456", "--username", "user@example.com"]), [
    "auth",
    "response",
    "--pin",
    "[REDACTED]",
    "--username",
    "user@example.com",
  ]);
});

test("ApplePwCliError stores sanitized args so PIN is not retained on the error object", () => {
  const rawArgs = ["auth", "response", "--pin", "secret-pin", "--salt", "salt"];
  const error = new ApplePwCliError({
    command: "/opt/homebrew/bin/applepw",
    args: rawArgs,
    exitCode: 1,
    stdout: "",
    stderr: "failed",
  });

  assert.deepEqual(error.args, ["auth", "response", "--pin", "[REDACTED]", "--salt", "salt"]);
  assert.equal(rawArgs[3], "secret-pin");
});

test("authenticate runs request and response", async () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const client = createApplePwClient({
    runner: async (command, args) => {
      calls.push({ command, args });
      if (args[0] === "auth" && args[1] === "request") {
        return {
          stdout: JSON.stringify({
            salt: "salt-value",
            serverKey: "server-key-value",
            username: "user@example.com",
            clientKey: "client-key-value",
          }),
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      }

      return {
        stdout: JSON.stringify({ status: 0 }),
        stderr: "",
        exitCode: 0,
        signal: null,
      };
    },
    binaryPath: "/bin/applepw",
  });

  const result = await client.authenticate("123456");

  assert.deepEqual(result, { status: 0 });
  assert.deepEqual(calls, [
    {
      command: "/bin/applepw",
      args: ["auth", "request"],
    },
    {
      command: "/bin/applepw",
      args: [
        "auth",
        "response",
        "--pin",
        "123456",
        "--salt",
        "salt-value",
        "--server-key",
        "server-key-value",
        "--client-key",
        "client-key-value",
        "--username",
        "user@example.com",
      ],
    },
  ]);
});

test("authenticate tolerates non-json log lines before the json status", async () => {
  let callCount = 0;
  const client = createApplePwClient({
    runner: async () => {
      callCount += 1;
      if (callCount === 1) {
        return {
          stdout: JSON.stringify({
            salt: "salt-value",
            serverKey: "server-key-value",
            username: "user@example.com",
            clientKey: "client-key-value",
          }),
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      }

      return {
        stdout: 'Challenge verified, updating config\n{"status":0}',
        stderr: "",
        exitCode: 0,
        signal: null,
      };
    },
    binaryPath: "/bin/applepw",
  });

  const result = await client.authenticate("123456");

  assert.deepEqual(result, { status: 0 });
});

test("getStatus exposes the status payload", async () => {
  const client = createApplePwClient({
    runner: async () => ({
      stdout: JSON.stringify({
        status: "ready",
        daemon: "running",
        authenticated: true,
      }),
      stderr: "",
      exitCode: 0,
      signal: null,
    }),
    binaryPath: "/bin/applepw",
  });

  const result = await client.getStatus();

  assert.equal(result.kind, "success");
  assert.deepEqual(result.payload, {
    status: "ready",
    daemon: "running",
    authenticated: true,
  });
});
