// Offline self-test: spins up a mock FirmLedger MCP server and exercises the client.
import { createServer } from "http";
import { AddressInfo } from "net";
import assert from "assert";
import { callTool, callWithHandshake, listRemoteTools, McpError } from "../src/lib/core";
import { TOOLS, TOOL_MAP, coerceArgs } from "../src/lib/tools";
import { discover, exchangeCode, refreshTokens, registerClient, resourceFor, revokeToken, OAuthError } from "../src/lib/oauth-core";

const seen: any[] = [];
const oauthSeen: any[] = [];
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.url === "/.well-known/oauth-authorization-server") {
      res.setHeader("content-type", "application/json");
      return res.end(
        JSON.stringify({
          authorization_endpoint: "http://x/a",
          token_endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}/oauth/token`,
          registration_endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}/oauth/register`,
          revocation_endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}/oauth/revoke`,
        }),
      );
    }
    if (req.url === "/oauth/register") {
      const j = JSON.parse(body);
      oauthSeen.push(j);
      res.setHeader("content-type", "application/json");
      res.statusCode = 201;
      return res.end(JSON.stringify({ client_id: "cid_1" }));
    }
    if (req.url === "/oauth/token") {
      const f = new URLSearchParams(body);
      oauthSeen.push(Object.fromEntries(f));
      res.setHeader("content-type", "application/json");
      if (f.get("refresh_token") === "dead") {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "invalid_grant" }));
      }
      return res.end(JSON.stringify({ access_token: "fl_oat_1", refresh_token: "fl_ort_1", expires_in: 28800, scope: "mcp read:account" }));
    }
    if (req.url === "/oauth/revoke") {
      oauthSeen.push({ revoked: new URLSearchParams(body).get("token") });
      return res.end("{}");
    }
    const msg = JSON.parse(body);
    seen.push({ auth: req.headers.authorization, msg });
    const reply = (result: any) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }));
    };
    if (msg.method === "tools/list") return reply({ tools: TOOLS.map((t) => ({ name: t.name })) });
    const { name, arguments: a } = msg.params;
    const ok = (data: any) =>
      reply({ content: [{ type: "text", text: "Summary line\n" + JSON.stringify(data) }], structuredContent: data });
    if (name === "get_news")
      return reply({
        isError: true,
        content: [{ type: "text", text: "x" }],
        structuredContent: { error: { code: "pro_required", message: "Pro only", upgrade_url: "https://x/pricing" } },
      });
    if (name === "watchlist_add") {
      if (!a.confirmation_token)
        return ok({
          status: "confirmation_required",
          action: "watchlist_add",
          action_summary: "Add Kilimo Soft",
          confirmation_token: "tok123",
        });
      return ok({ status: "done", token: a.confirmation_token });
    }
    if (name === "bad") {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "Invalid key", data: { reason: "invalid_key" } } }));
    }
    ok({ total: 1, results: [{ name: "Acme", slug: "acme", echo: a }] });
  });
});

(async () => {
  await new Promise<void>((r) => server.listen(0, r));
  const cfg = { endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`, apiKey: "fl_live_test" };

  // catalog
  assert.equal(TOOLS.length, 51, "51 tools");
  assert.equal(new Set(TOOLS.map((t) => t.name)).size, 51, "unique names");
  const count = (g: string) => TOOLS.filter((t) => t.group === g).length;
  assert.deepEqual([count("open"), count("pro"), count("account_read"), count("account_write")], [15, 4, 12, 20]);
  assert.equal(Object.keys(TOOL_MAP).length, 51);

  // plain call, auth header, arg cleaning
  const r = await callTool(cfg, "search_listings", { query: "acme", city: "", limit: 5 });
  assert.equal(r.summary, "Summary line");
  assert.equal(seen.at(-1).auth, "Bearer fl_live_test");
  assert.deepEqual(seen.at(-1).msg.params.arguments, { query: "acme", limit: 5 });

  // every tool callable
  for (const t of TOOLS) {
    if (t.name === "get_news" || t.name === "watchlist_add") continue;
    const out = await callWithHandshake(cfg, t.name, {}, async () => true);
    assert.ok(out.data, t.name);
  }

  // tool error mapping
  await assert.rejects(
    callTool(cfg, "get_news", { listing: "x" }),
    (e: any) => e instanceof McpError && e.code === "pro_required" && e.details?.upgrade_url === "https://x/pricing",
  );

  // handshake: confirm, then decline
  const done = await callWithHandshake(
    cfg,
    "watchlist_add",
    { listing: "kilimo-soft" },
    async (i) => (assert.equal(i.summary, "Add Kilimo Soft"), true),
  );
  assert.equal((done.data as any).status, "done");
  assert.equal(seen.at(-1).msg.params.arguments.confirmation_token, "tok123");
  assert.equal(seen.at(-1).msg.params.arguments.listing, "kilimo-soft");
  const calls = seen.length;
  const no = await callWithHandshake(cfg, "watchlist_add", { listing: "kilimo-soft" }, async () => false);
  assert.ok(no.cancelled);
  assert.equal(seen.length, calls + 1, "declining makes no second call");

  // HTTP/JSON-RPC error
  await assert.rejects(callTool(cfg, "bad", {}), (e: any) => e.code === "invalid_key" && e.status === 401);

  // tools/list
  assert.equal((await listRemoteTools(cfg)).length, 51);

  // coercion
  const d = TOOL_MAP.search_listings;
  assert.deepEqual(coerceArgs(d, { query: " a ", limit: "10", verified_only: true, type: "" }), {
    query: "a",
    limit: 10,
    verified_only: true,
  });
  assert.deepEqual(coerceArgs(TOOL_MAP.compare_listings, { listings: "a\nb, c" }), { listings: ["a", "b", "c"] });
  assert.throws(() => coerceArgs(TOOL_MAP.reply_to_lead, { lead_id: "", message: "" }), /Missing required: lead_id, message/);
  assert.deepEqual(coerceArgs(TOOL_MAP.update_my_listing, { listing: "x", socials: '{"x":"u"}' }), { listing: "x", socials: { x: "u" } });

  // OAuth
  assert.equal(resourceFor("https://mcp.firmledger.co.ke/mcp/fl_live_abcdef"), "https://mcp.firmledger.co.ke/mcp");
  assert.equal(resourceFor("https://mcp.firmledger.co.ke/user-mcp/"), "https://mcp.firmledger.co.ke/user-mcp");
  const ep = await discover(cfg.endpoint);
  assert.ok(ep.token.endsWith("/oauth/token"));
  assert.equal(await registerClient(ep, "https://raycast.com/redirect?packageName=Extension"), "cid_1");
  assert.equal(oauthSeen[0].token_endpoint_auth_method, "none");
  assert.deepEqual(oauthSeen[0].redirect_uris, ["https://raycast.com/redirect?packageName=Extension"]);
  const tk = await exchangeCode(ep, { clientId: "cid_1", code: "c", verifier: "v", redirectUri: "r", resource: "res" });
  assert.equal(tk.access_token, "fl_oat_1");
  assert.equal(oauthSeen.at(-1).code_verifier, "v");
  assert.equal(oauthSeen.at(-1).grant_type, "authorization_code");
  await refreshTokens(ep, { clientId: "cid_1", refreshToken: "fl_ort_1", resource: "res" });
  assert.equal(oauthSeen.at(-1).grant_type, "refresh_token");
  await assert.rejects(
    refreshTokens(ep, { clientId: "cid_1", refreshToken: "dead", resource: "res" }),
    (e: any) => e instanceof OAuthError && e.code === "invalid_grant",
  );
  await revokeToken(ep, "fl_ort_1");
  assert.equal(oauthSeen.at(-1).revoked, "fl_ort_1");

  console.log("selftest: all passed (51 tools, handshake, errors, coercion, OAuth)");
  server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
