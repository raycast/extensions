import test from "node:test";
import assert from "node:assert/strict";

test("parseProcessInfoFromPsOutput extracts pid, csrf token and extension port", async () => {
  const { parseProcessInfoFromPsOutput } = await import("./probe");

  const output = `
  111 /Applications/Other.app/Contents/MacOS/language_server_macos --app_data_dir other --csrf_token abc
  222 /Applications/Antigravity.app/Contents/MacOS/language_server_macos --app_data_dir antigravity --csrf_token token-123 --extension_server_port 48765
  `;

  const parsed = parseProcessInfoFromPsOutput(output);

  assert.equal(parsed.sawAntigravityProcess, true);
  assert.ok(parsed.processInfo);
  assert.equal(parsed.processInfo?.pid, 222);
  assert.equal(parsed.processInfo?.csrfToken, "token-123");
  assert.equal(parsed.processInfo?.extensionPort, 48765);
});

test("parseProcessInfoFromPsOutput marks antigravity seen when csrf token missing", async () => {
  const { parseProcessInfoFromPsOutput } = await import("./probe");

  const output = `
  333 /Applications/Antigravity.app/Contents/MacOS/language_server_macos --app_data_dir antigravity --extension_server_port 41234
  `;

  const parsed = parseProcessInfoFromPsOutput(output);

  assert.equal(parsed.sawAntigravityProcess, true);
  assert.equal(parsed.processInfo, null);
});

test("parseProcessInfoFromWindowsProcessList extracts pid, csrf token and extension port for x64", async () => {
  const { parseProcessInfoFromWindowsProcessList } = await import("./probe");

  const parsed = parseProcessInfoFromWindowsProcessList([
    {
      ProcessId: 444,
      Name: "language_server_windows_x64.exe",
      ExecutablePath:
        "C:\\Users\\me\\AppData\\Local\\Programs\\Antigravity\\resources\\app\\extensions\\antigravity\\bin\\language_server_windows_x64.exe",
      CommandLine:
        '"C:\\Users\\me\\AppData\\Local\\Programs\\Antigravity\\resources\\app\\extensions\\antigravity\\bin\\language_server_windows_x64.exe" --app_data_dir C:\\Users\\me\\AppData\\Roaming\\Antigravity --csrf_token token-456 --extension_server_port 51234',
    },
  ]);

  assert.equal(parsed.sawAntigravityProcess, true);
  assert.ok(parsed.processInfo);
  assert.equal(parsed.processInfo?.pid, 444);
  assert.equal(parsed.processInfo?.csrfToken, "token-456");
  assert.equal(parsed.processInfo?.extensionPort, 51234);
});

test("parseProcessInfoFromWindowsProcessList marks antigravity arm64 process seen when csrf token missing", async () => {
  const { parseProcessInfoFromWindowsProcessList } = await import("./probe");

  const parsed = parseProcessInfoFromWindowsProcessList([
    {
      ProcessId: 555,
      Name: "language_server_windows_arm.exe",
      ExecutablePath:
        "C:\\Users\\me\\AppData\\Local\\Programs\\Antigravity\\resources\\app\\extensions\\antigravity\\bin\\language_server_windows_arm.exe",
    },
  ]);

  assert.equal(parsed.sawAntigravityProcess, true);
  assert.equal(parsed.processInfo, null);
});

test("parseListeningPorts parses and de-duplicates listening ports", async () => {
  const { parseListeningPorts } = await import("./probe");

  const output = `
COMMAND   PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
server    222 me    10u  IPv4 0x0000000000000000      0t0  TCP 127.0.0.1:8080 (LISTEN)
server    222 me    11u  IPv4 0x0000000000000000      0t0  TCP *:8080 (LISTEN)
server    222 me    12u  IPv4 0x0000000000000000      0t0  TCP 127.0.0.1:9090 (LISTEN)
`;

  const ports = parseListeningPorts(output);

  assert.deepEqual(ports, [8080, 9090]);
});

test("parseListeningPortsFromNetstatOutput parses and de-duplicates Windows listening ports for one pid", async () => {
  const { parseListeningPortsFromNetstatOutput } = await import("./probe");

  const output = `
  Proto  Local Address          Foreign Address        State           PID
  TCP    127.0.0.1:6463         0.0.0.0:0              LISTENING       19692
  TCP    127.0.0.1:6463         0.0.0.0:0              LISTENING       19692
  TCP    [::1]:7768             [::]:0                 LISTENING       19692
  TCP    127.0.0.1:51234        0.0.0.0:0              LISTENING       99999
`;

  const ports = parseListeningPortsFromNetstatOutput(output, 19692);

  assert.deepEqual(ports, [6463, 7768]);
});

test("requestWithFallback retries with HTTP on the same port when HTTPS fails", async () => {
  const { requestWithFallback } = await import("./probe");

  const attempts: string[] = [];

  const sendRequest = async (options: { scheme: "http" | "https"; port: number }) => {
    attempts.push(`${options.scheme}:${options.port}`);

    if (options.scheme === "https") {
      throw new Error("tls failed");
    }

    return { ok: true };
  };

  const result = await requestWithFallback(
    { path: "/test", body: {} },
    { httpsPort: 8443, httpPort: 8443, csrfToken: "csrf", timeoutMs: 1000 },
    sendRequest as never,
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(attempts, ["https:8443", "http:8443"]);
});

test("requestWithFallback retries HTTP on detected port when extension HTTP port is unavailable", async () => {
  const { requestWithFallback } = await import("./probe");

  const attempts: string[] = [];

  const sendRequest = async (options: { scheme: "http" | "https"; port: number }) => {
    attempts.push(`${options.scheme}:${options.port}`);

    if (options.scheme === "https") {
      throw new Error("tls failed");
    }

    return { ok: true };
  };

  const result = await requestWithFallback(
    { path: "/test", body: {} },
    { httpsPort: 9443, httpPort: null, csrfToken: "csrf", timeoutMs: 1000 },
    sendRequest as never,
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(attempts, ["https:9443", "http:9443"]);
});
