import { strict as assert } from "node:assert";
import {
  ApplePwCliError,
  buildAuthResponseArgs,
  buildSearchCandidates,
  createApplePwClient,
  resolveApplePwBinaryCandidates,
  sanitizeLoggedArgs,
} from "../applepw";
import { test } from "./test-harness";

test("preserves auth-required output for listPasswords", async () => {
  const calls: string[][] = [];
  const client = createApplePwClient({
    runner: async (_command, args) => {
      calls.push(args);
      return args[0] === "auth"
        ? { stdout: JSON.stringify({ status: 0 }), stderr: "", exitCode: 0, signal: null }
        : { stdout: "Enter PIN:", stderr: "", exitCode: null, signal: null };
    },
    binaryPath: "/bin/applepw",
  });

  const result = await client.listPasswords("example.com");
  await client.requestAuthentication();
  const authResult = await client.authenticate("123456");

  assert.equal(result.kind, "auth-required");
  assert.equal(result.prompt, "Choose Request Code, then enter the 6-digit code shown by Apple Passwords.");
  assert.deepEqual(authResult, { status: 0 });
  assert.deepEqual(calls, [
    ["pw", "list", "example.com"],
    ["auth", "request"],
    ["auth", "response", "--pin", "123456"],
  ]);
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
      has_otp: true,
    },
  ]);
});

test("getOtp preserves auth-required output", async () => {
  const client = createApplePwClient({
    runner: async (_command, args) =>
      args[0] === "auth"
        ? { stdout: JSON.stringify({ status: 0 }), stderr: "", exitCode: 0, signal: null }
        : { stdout: "", stderr: "Enter PIN:", exitCode: null, signal: null },
    binaryPath: "/bin/applepw",
  });

  const result = await client.getOtp("example.com");

  assert.equal(result.kind, "auth-required");
  assert.equal(result.prompt, "Choose Request Code, then enter the 6-digit code shown by Apple Passwords.");
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
  assert.equal(candidates[0], "apw");
  assert.equal(candidates.includes("/opt/homebrew/bin/apw"), true);
  assert.equal(candidates.includes("/usr/local/bin/apw"), true);
});

test("builds URL candidates for domain fragments, domains, and full URLs", () => {
  assert.deepEqual(buildSearchCandidates("example.com"), ["example.com", "https://example.com"]);
  assert.deepEqual(buildSearchCandidates("https://login.example.com/path"), [
    "https://login.example.com/path",
    "login.example.com",
    "https://login.example.com",
    "example.com",
    "https://example.com",
  ]);

  const fragmentCandidates = buildSearchCandidates("example");
  assert.equal(fragmentCandidates.includes("example.com"), true);
  assert.equal(fragmentCandidates.includes("https://example.com"), true);
});

test("tries expanded domain candidates until live discovery returns an account", async () => {
  const calls: string[][] = [];
  const client = createApplePwClient({
    runner: async (_command, args) => {
      calls.push(args);
      const results =
        args[0] === "pw" && args[2] === "example.com"
          ? [{ id: "1", username: "alice@example.com", domain: "example.com", password: "Not Included" }]
          : [];
      return {
        stdout: JSON.stringify({ results, status: 0 }),
        stderr: "",
        exitCode: 0,
        signal: null,
      };
    },
    binaryPath: "/bin/apw",
  });

  const result = await client.listPasswords("example");

  assert.equal(result.kind, "success");
  assert.equal(result.payload.length, 1);
  assert.deepEqual(calls, [
    ["pw", "list", "example"],
    ["pw", "list", "https://example"],
    ["pw", "list", "example.com"],
    ["otp", "list", "example.com"],
  ]);
});

test("builds auth response arguments correctly", () => {
  const args = buildAuthResponseArgs("123456");

  assert.deepEqual(args, ["auth", "response", "--pin", "123456"]);
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

test("authenticate responds to an already-requested challenge", async () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const client = createApplePwClient({
    runner: async (command, args) => {
      calls.push({ command, args });
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
      args: ["auth", "response", "--pin", "123456"],
    },
  ]);
});

test("authenticate tolerates non-json log lines before the json status", async () => {
  const client = createApplePwClient({
    runner: async () => ({
      stdout: 'Challenge verified, updating config\n{"status":0}',
      stderr: "",
      exitCode: 0,
      signal: null,
    }),
    binaryPath: "/bin/applepw",
  });

  await client.requestAuthentication();
  const result = await client.authenticate("123456");

  assert.deepEqual(result, { status: 0 });
});

test("treats APW invalid-session responses as authentication required", async () => {
  const client = createApplePwClient({
    runner: async (_command, args) =>
      args[0] === "auth"
        ? { stdout: JSON.stringify({ status: 0 }), stderr: "", exitCode: 0, signal: null }
        : {
            stdout: "",
            stderr: JSON.stringify({ error: "APW is not running or not authenticated", status: 9, results: [] }),
            exitCode: 9,
            signal: null,
          },
    binaryPath: "/bin/apw",
  });

  const result = await client.listPasswords("example.com");

  assert.equal(result.kind, "auth-required");
});

test("starts the APW daemon before retrying authentication", async () => {
  let requestCount = 0;
  let daemonStartCount = 0;
  const client = createApplePwClient({
    runner: async (_command, args) => {
      if (args[0] === "auth" && args[1] === "request") {
        requestCount += 1;
        if (requestCount === 1) {
          return {
            stdout: "",
            stderr: JSON.stringify({ error: "APW is not running", status: 9, results: [] }),
            exitCode: 9,
            signal: null,
          };
        }
      }

      return {
        stdout: JSON.stringify({ status: 0 }),
        stderr: "",
        exitCode: 0,
        signal: null,
      };
    },
    daemonStarter: async () => {
      daemonStartCount += 1;
    },
    binaryPath: "/bin/apw",
  });

  await client.requestAuthentication();
  const result = await client.authenticate("123456");

  assert.deepEqual(result, { status: 0 });
  assert.equal(daemonStartCount, 1);
  assert.equal(requestCount, 2);
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
