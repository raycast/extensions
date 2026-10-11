import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NamecheapApiError, parseApiResponse } from "../src/namecheap/parse";
import { apiAccessUrl, whitelistUrl } from "../src/namecheap/urls";
import { createClient } from "../src/namecheap/client";

/** The wording the live API actually returns, which differs from Namecheap's published error table. */
const WHITELIST_ERROR = `<?xml version="1.0" encoding="utf-8"?>
<ApiResponse Status="ERROR" xmlns="http://api.namecheap.com/xml.response">
  <Errors><Error Number="1011150">Invalid request IP: 83.227.125.164</Error></Errors>
  <Warnings />
  <RequestedCommand />
</ApiResponse>`;

const BAD_KEY_ERROR = `<?xml version="1.0" encoding="utf-8"?>
<ApiResponse Status="ERROR" xmlns="http://api.namecheap.com/xml.response">
  <Errors><Error Number="1011102">API Key is invalid or API access has not been enabled</Error></Errors>
</ApiResponse>`;

const BARE_ERROR = `<?xml version="1.0" encoding="utf-8"?>
<ApiResponse Status="ERROR" xmlns="http://api.namecheap.com/xml.response">
  <Errors><Error>Too many requests</Error></Errors>
</ApiResponse>`;

const expectError = (xml: string, environment?: "sandbox" | "production") => {
  try {
    parseApiResponse(xml, environment);
  } catch (error) {
    assert.ok(error instanceof NamecheapApiError);
    return error;
  }
  throw new Error("expected parseApiResponse to throw");
};

describe("whitelist rejection", () => {
  it("extracts the address Namecheap actually rejected", () => {
    assert.equal(expectError(WHITELIST_ERROR).requestIp, "83.227.125.164");
  });

  it("is flagged as a whitelist error", () => {
    assert.equal(expectError(WHITELIST_ERROR).isWhitelistError, true);
  });

  it("never suggests the Client IP preference, which cannot fix a source-IP rejection", () => {
    const hint = expectError(WHITELIST_ERROR).hint ?? "";
    assert.match(hint, /whitelist/i);
    assert.doesNotMatch(hint, /client ip/i);
  });

  it("records which environment rejected the request", () => {
    assert.equal(expectError(WHITELIST_ERROR, "sandbox").environment, "sandbox");
    assert.equal(expectError(WHITELIST_ERROR, "production").environment, "production");
  });
});

describe("credential rejection", () => {
  it("is not treated as a whitelist problem", () => {
    const error = expectError(BAD_KEY_ERROR);
    assert.equal(error.isWhitelistError, false);
    assert.equal(error.requestIp, undefined);
    assert.match(error.hint ?? "", /api key/i);
  });
});

describe("malformed error elements", () => {
  it("keeps the text of an <Error> that carries no attributes", () => {
    const error = expectError(BARE_ERROR);
    assert.equal(error.message, "Too many requests");
    assert.equal(error.number, "");
    assert.equal(error.isWhitelistError, false);
  });
});

describe("environment-aware setup links", () => {
  it("points sandbox users at the sandbox account", () => {
    assert.equal(apiAccessUrl(true), "https://ap.www.sandbox.namecheap.com/settings/tools/apiaccess/");
    assert.equal(whitelistUrl(true), "https://ap.www.sandbox.namecheap.com/settings/tools/apiaccess/whitelisted-ips");
  });

  it("points production users at the production account", () => {
    assert.equal(apiAccessUrl(false), "https://ap.www.namecheap.com/settings/tools/apiaccess/");
    assert.equal(whitelistUrl(false), "https://ap.www.namecheap.com/settings/tools/apiaccess/whitelisted-ips");
  });

  it("never uses the ap.sandbox host, which does not resolve", () => {
    assert.doesNotMatch(apiAccessUrl(true), /\/\/ap\.sandbox\./);
  });
});

describe("HTTP failures behind the CDN", () => {
  const config = { apiUser: "u", apiKey: "k", clientIp: "203.0.113.10" };

  it("reports the status even when the body is an HTML error page", async () => {
    const fetchImpl = (async () =>
      new Response("<!DOCTYPE html><html><body>Forbidden</body></html>", { status: 403 })) as typeof fetch;
    await assert.rejects(createClient(config, fetchImpl).listDomains(), /HTTP 403/);
  });

  it("still surfaces a real API error carried on a non-2xx response", async () => {
    const fetchImpl = (async () => new Response(WHITELIST_ERROR, { status: 400 })) as typeof fetch;
    await assert.rejects(createClient(config, fetchImpl).listDomains(), NamecheapApiError);
  });

  it("tags client errors with the environment in use", async () => {
    const fetchImpl = (async () => new Response(WHITELIST_ERROR, { status: 200 })) as typeof fetch;
    const client = createClient({ ...config, sandbox: true }, fetchImpl);
    assert.equal(client.environment, "sandbox");
    await assert.rejects(client.listDomains(), (error: unknown) => {
      assert.ok(error instanceof NamecheapApiError);
      assert.equal(error.environment, "sandbox");
      assert.equal(error.requestIp, "83.227.125.164");
      return true;
    });
  });
});
