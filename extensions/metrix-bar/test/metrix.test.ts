import { execFile } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer, type RequestListener, type Server } from "node:http";
import { promisify } from "node:util";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { fetchDashboards } from "../src/lib/metrix";

const servers: Server[] = [];
const apiToken = "test-only-private-token";

async function serve(handler: RequestListener): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test port");
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.closeAllConnections();
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

describe("local dashboard API", () => {
  it("requests the installed instances with Bearer authentication and no Origin", async () => {
    const dashboards = [
      { id: "official--github-repo", title: "GitHub", enabled: true, status: "error" },
      { id: "off", title: "Disabled", enabled: false, disabled_reason: "user", status: "idle" },
    ];
    const apiUrl = await serve((request, response) => {
      expect(request.method).toBe("GET");
      expect(request.url).toBe("/v0/dashboards");
      expect(request.headers.authorization).toBe(`Bearer ${apiToken}`);
      expect(request.headers.origin).toBeUndefined();
      response.end(JSON.stringify({ dashboards }));
    });
    expect(await fetchDashboards({ apiUrl, apiToken })).toEqual(dashboards);
  });

  it("accepts titled and untitled dashboards in the same response", async () => {
    const dashboards = [
      { id: "named", title: "Named", icon: "dashboard-3-line", enabled: true },
      { id: "untitled", enabled: false },
    ];
    const apiUrl = await serve((_, response) => response.end(JSON.stringify({ dashboards })));
    expect(await fetchDashboards({ apiUrl, apiToken })).toEqual(dashboards);
  });

  it("keeps credentials on loopback when Node enables environment proxies", async () => {
    const dashboards = [{ id: "direct", enabled: true }];
    const apiUrl = await serve((_, response) => response.end(JSON.stringify({ dashboards })));
    let proxyRequests = 0;
    const proxy = await serve((_, response) => {
      proxyRequests++;
      response.end('{"dashboards":[]}');
    });
    // Compile the actual client for a fresh Node process, where proxy flags take effect at startup.
    const moduleURL = (source: string) =>
      `data:text/javascript;base64,${Buffer.from(
        transpileModule(source, { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2023 } })
          .outputText,
      ).toString("base64")}`;
    const links = moduleURL(await readFile(new URL("../src/lib/deeplinks.ts", import.meta.url), "utf8"));
    const client = moduleURL(
      (await readFile(new URL("../src/lib/metrix.ts", import.meta.url), "utf8")).replace(
        '"./deeplinks"',
        JSON.stringify(links),
      ),
    );
    const script = `import { fetchDashboards } from ${JSON.stringify(client)};
      process.stdout.write(JSON.stringify(await fetchDashboards(${JSON.stringify({ apiUrl, apiToken })})));`;
    const { stdout } = await promisify(execFile)(process.execPath, ["--input-type=module", "-e", script], {
      timeout: 10_000,
      env: {
        ...process.env,
        NODE_USE_ENV_PROXY: "1",
        HTTP_PROXY: proxy,
        http_proxy: proxy,
        NO_PROXY: "",
        no_proxy: "",
      },
    });
    expect(proxyRequests).toBe(0);
    expect(JSON.parse(stdout)).toEqual(dashboards);
  });

  it("accepts an empty installed list", async () => {
    const apiUrl = await serve((_, response) => response.end('{"dashboards":[]}'));
    expect(await fetchDashboards({ apiUrl, apiToken })).toEqual([]);
  });

  it.each([401, 403])("explains authentication failure %s without exposing response content", async (status) => {
    const apiUrl = await serve((_, response) => {
      response.writeHead(status);
      response.end(apiToken);
    });
    await expect(fetchDashboards({ apiUrl, apiToken })).rejects.toMatchObject({ kind: "authentication" });
    await expect(fetchDashboards({ apiUrl, apiToken })).rejects.not.toThrow(apiToken);
  });

  it("does not follow redirects or forward the token to another endpoint", async () => {
    let forwarded = false;
    const destination = await serve((_, response) => {
      forwarded = true;
      response.end('{"dashboards":[]}');
    });
    const apiUrl = await serve((_, response) => {
      response.writeHead(302, { Location: destination });
      response.end();
    });
    await expect(fetchDashboards({ apiUrl, apiToken })).rejects.toMatchObject({ kind: "response" });
    expect(forwarded).toBe(false);
  });

  it.each([
    "not a URL",
    "https://127.0.0.1:6387",
    "http://example.com",
    "http://127.0.0.1.example.com",
    "http://192.168.1.1:6387",
    "http://user:password@127.0.0.1:6387",
    "http://127.0.0.1:6387/v0",
    "http://127.0.0.1:6387/?token=secret",
    "http://127.0.0.1:6387/#secret",
  ])("rejects an invalid or non-loopback API base URL %s before sending credentials", async (apiUrl) => {
    await expect(fetchDashboards({ apiUrl, apiToken })).rejects.toMatchObject({ kind: "configuration" });
  });

  it.each(["", " ", "token\r\nInjected: header"])("rejects an unusable token %j", async (token) => {
    await expect(fetchDashboards({ apiUrl: "http://127.0.0.1:6387", apiToken: token })).rejects.toMatchObject({
      kind: "configuration",
    });
  });

  it.each([
    "not JSON with test-only-private-token",
    "{}",
    '{"dashboards":null}',
    '{"dashboards":[{"id":"a","title":"A"}]}',
    '{"dashboards":[{"id":"a","icon":42,"enabled":true}]}',
    '{"dashboards":[{"id":"a/b","title":"A","enabled":true}]}',
    JSON.stringify({ dashboards: [{ id: "\ud800", enabled: true }] }),
  ])("rejects malformed responses without displaying raw content", async (body) => {
    const apiUrl = await serve((_, response) => response.end(body));
    await expect(fetchDashboards({ apiUrl, apiToken })).rejects.toMatchObject({ kind: "response" });
    await expect(fetchDashboards({ apiUrl, apiToken })).rejects.not.toThrow(apiToken);
  });

  it("explains that the app or local API is unavailable", async () => {
    const server = createServer();
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test port");
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await expect(fetchDashboards({ apiUrl: `http://127.0.0.1:${address.port}`, apiToken })).rejects.toMatchObject({
      kind: "unavailable",
    });
  });

  it("cancels a request when the command is closed or refreshed", async () => {
    const controller = new AbortController();
    const reason = new Error("Command closed");
    const apiUrl = await serve(() => controller.abort(reason));
    await expect(fetchDashboards({ apiUrl, apiToken }, controller.signal)).rejects.toBe(reason);
  });

  it("cancels while a successful response body is still streaming", async () => {
    const controller = new AbortController();
    const reason = new Error("Command closed during response");
    const apiUrl = await serve((_, response) => {
      response.writeHead(200, { "Content-Length": "1000" });
      response.write('{"dashboards":');
      setImmediate(() => controller.abort(reason));
    });
    await expect(fetchDashboards({ apiUrl, apiToken }, controller.signal)).rejects.toBe(reason);
  });

  it("reports a disconnected successful response without exposing its body", async () => {
    const apiUrl = await serve((_, response) => {
      response.writeHead(200, { "Content-Length": "1000" });
      response.write(apiToken);
      setImmediate(() => response.destroy());
    });
    await expect(fetchDashboards({ apiUrl, apiToken })).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("times out a server that never responds", async () => {
    const apiUrl = await serve(() => undefined);
    await expect(fetchDashboards({ apiUrl, apiToken })).rejects.toMatchObject({ kind: "timeout" });
  }, 10_000);
});
