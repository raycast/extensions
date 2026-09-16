import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scopeKey } from "../src/domain/scope";
import { recoveryFor } from "../src/domain/failure";
import { NamecheapApiError, parseApiResponse } from "../src/namecheap/parse";

const apiError = (number: string, message: string) => {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<ApiResponse Status="ERROR" xmlns="http://api.namecheap.com/xml.response">
  <Errors><Error Number="${number}">${message}</Error></Errors>
</ApiResponse>`;
  try {
    parseApiResponse(xml);
  } catch (error) {
    return error as NamecheapApiError;
  }
  throw new Error("expected a NamecheapApiError");
};

describe("stored data is scoped to an account, not just an environment", () => {
  it("separates two accounts in the same environment", () => {
    assert.notEqual(scopeKey("production", "alice"), scopeKey("production", "bob"));
  });

  it("separates the same account across environments", () => {
    assert.notEqual(scopeKey("production", "alice"), scopeKey("sandbox", "alice"));
  });

  it("is stable for the same account, ignoring case and padding", () => {
    assert.equal(scopeKey("production", "Alice"), scopeKey("production", "  alice "));
  });

  it("does not leak the account name into the key, since the pricing cache is plaintext", () => {
    assert.doesNotMatch(scopeKey("production", "ricardodantas"), /ricardodantas/);
  });

  it("keeps the environment readable for debugging", () => {
    assert.match(scopeKey("sandbox", "alice"), /^sandbox:/);
  });
});

describe("the leading recovery action matches the failure", () => {
  it("leads with the whitelist flow only when the address was rejected", () => {
    assert.equal(recoveryFor(apiError("1011150", "Invalid request IP: 203.0.113.10")), "whitelist");
    assert.equal(recoveryFor(apiError("1017150", "Parameter RequestIP is disabled")), "whitelist");
  });

  it("sends a rejected credential to the preferences, not to the whitelist page", () => {
    for (const number of ["1011102", "1010102", "1011101", "1016103", "1011105"]) {
      assert.equal(recoveryFor(apiError(number, "bad value")), "preferences", `error ${number}`);
    }
  });

  it("offers a retry for transient API failures", () => {
    assert.equal(recoveryFor(apiError("5050900", "Unhandled exception")), "retry");
    assert.equal(recoveryFor(apiError("3031510", "Error response from provider")), "retry");
  });

  it("offers a retry for network and HTTP failures", () => {
    assert.equal(recoveryFor(new Error("fetch failed")), "retry");
    assert.equal(recoveryFor(new Error("Namecheap API responded with HTTP 502")), "retry");
  });

  it("treats a missing or malformed preference as a preferences problem", () => {
    assert.equal(recoveryFor(new Error("Add your Namecheap API User and API Key in the extension preferences.")), "preferences");
    assert.equal(recoveryFor(new Error('"nope" is not a valid IPv4 address.')), "preferences");
  });
});
