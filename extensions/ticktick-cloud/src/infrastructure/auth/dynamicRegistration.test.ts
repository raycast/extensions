import { describe, expect, it } from "vitest";

import { ProtocolError } from "../../domain/errors";
import { DYNAMIC_REGISTRATION_REQUEST, registerPublicClient } from "./dynamicRegistration";

describe("registerPublicClient", () => {
  it("posts exactly the locked JSON registration request and returns only the client ID", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push([url, init]);
      return new Response(
        JSON.stringify({ client_id: "public-client", client_secret: "must-not-leak", ignored: true }),
        { status: 201 }
      );
    }) as typeof fetch;

    await expect(registerPublicClient("https://api.ticktick.com/oauth/register", fetchImpl)).resolves.toBe(
      "public-client"
    );
    expect(calls).toEqual([
      [
        "https://api.ticktick.com/oauth/register",
        {
          method: "POST",
          redirect: "error",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(DYNAMIC_REGISTRATION_REQUEST),
        },
      ],
    ]);
  });

  it.each([{}, { client_id: "   " }, { client_id: 42 }])(
    "rejects malformed or whitespace client_id %#",
    async (body) => {
      const fetchImpl = (async () => new Response(JSON.stringify(body), { status: 201 })) as typeof fetch;
      await expect(registerPublicClient("https://api.ticktick.com/oauth/register", fetchImpl)).rejects.toBeInstanceOf(
        ProtocolError
      );
    }
  );

  it.each([
    "http://api.ticktick.com/oauth/register",
    "https://user:password@api.ticktick.com/oauth/register",
    "https://api.ticktick.com/oauth/register?token=secret",
    "https://api.ticktick.com/oauth/register#fragment",
    "https://api.ticktick.com/other",
  ])("rejects an unsafe or unverified endpoint before fetch: %s", async (endpoint) => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response();
    }) as typeof fetch;
    await expect(registerPublicClient(endpoint, fetchImpl)).rejects.toBeInstanceOf(ProtocolError);
    expect(calls).toBe(0);
  });

  it("rejects an observable redirect", async () => {
    const redirected = new Response(JSON.stringify({ client_id: "public-client" }), { status: 201 });
    Object.defineProperty(redirected, "redirected", { value: true });
    const fetchImpl = (async () => redirected) as typeof fetch;
    await expect(registerPublicClient("https://api.ticktick.com/oauth/register", fetchImpl)).rejects.toBeInstanceOf(
      ProtocolError
    );
  });
});
