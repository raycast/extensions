import { describe, expect, it } from "vitest";

import { ProtocolError } from "../../domain/errors";
import { OAuthClientRegistrationStore, type RegistrationStorage } from "./OAuthClientRegistrationStore";
import { registerPublicClient } from "./dynamicRegistration";

class MemoryStorage implements RegistrationStorage {
  readonly values = new Map<string, string>();
  getCalls = 0;
  setCalls = 0;
  async getItem(key: string): Promise<string | undefined> {
    this.getCalls += 1;
    return this.values.get(key);
  }
  async setItem(key: string, value: string): Promise<void> {
    this.setCalls += 1;
    this.values.set(key, value);
  }
}

describe("OAuthClientRegistrationStore", () => {
  it("reuses a matching registration without another POST", async () => {
    const storage = new MemoryStorage();
    const store = new OAuthClientRegistrationStore(storage);
    const register = async () => "client-one";
    await store.getOrRegister("mcp", "https://api.ticktick.com/oauth/register", register);
    await expect(
      store.getOrRegister("mcp", "https://api.ticktick.com/oauth/register", async () => {
        throw new Error("should not post");
      })
    ).resolves.toBe("client-one");
  });

  it.each([
    "http://api.ticktick.com/oauth/register",
    "https://api.ticktick.com/oauth/register?secret=bad",
    "https://api.ticktick.com/other",
  ])("rejects an unsafe endpoint before any storage or registration effect: %s", async (endpoint) => {
    const storage = new MemoryStorage();
    const store = new OAuthClientRegistrationStore(storage);
    let callbacks = 0;

    await expect(
      store.getOrRegister("mcp", endpoint, async () => {
        callbacks += 1;
        return "client";
      })
    ).rejects.toBeInstanceOf(ProtocolError);
    expect(callbacks).toBe(0);
    expect(storage.getCalls).toBe(0);
    expect(storage.setCalls).toBe(0);
    expect(storage.values).toEqual(new Map());
  });

  it("replaces endpoint/target mismatches and malformed storage, persisting the minimal shape only", async () => {
    const storage = new MemoryStorage();
    const store = new OAuthClientRegistrationStore(storage);
    await store.getOrRegister("mcp", "https://api.ticktick.com/oauth/register", async () => "first");
    storage.values.set(
      "ticktick.oauth.public-client.v2.mcp",
      JSON.stringify({ target: "mcp", clientId: "stale-endpoint", registrationEndpoint: "https://ticktick.com/two" })
    );
    await expect(
      store.getOrRegister("mcp", "https://api.ticktick.com/oauth/register", async () => "second")
    ).resolves.toBe("second");
    storage.values.set(
      "ticktick.oauth.public-client.v2.mcp",
      JSON.stringify({
        target: "openapi",
        clientId: "wrong-target",
        registrationEndpoint: "https://api.ticktick.com/oauth/register",
        client_secret: "stale-secret",
      })
    );
    await expect(
      store.getOrRegister("mcp", "https://api.ticktick.com/oauth/register", async () => "target-replaced")
    ).resolves.toBe("target-replaced");
    storage.values.set("ticktick.oauth.public-client.v2.openapi", "corrupt");
    await expect(
      store.getOrRegister("openapi", "https://api.ticktick.com/oauth/register", async () => "open-client")
    ).resolves.toBe("open-client");
    const persisted = [...storage.values.values()].join(" ");
    expect(persisted).not.toContain("client_secret");
    expect(JSON.parse(storage.values.get("ticktick.oauth.public-client.v2.mcp") ?? "{}")).toEqual({
      target: "mcp",
      clientId: "target-replaced",
      registrationEndpoint: "https://api.ticktick.com/oauth/register",
    });
  });

  it("never persists a client_secret returned by registration", async () => {
    const storage = new MemoryStorage();
    const store = new OAuthClientRegistrationStore(storage);
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ client_id: "public-client", client_secret: "returned-secret" }), {
        status: 201,
      })) as typeof fetch;
    await store.getOrRegister("mcp", "https://api.ticktick.com/oauth/register", () =>
      registerPublicClient("https://api.ticktick.com/oauth/register", fetchImpl)
    );
    const persisted = [...storage.values.values()].join(" ");
    expect(persisted).not.toContain("client_secret");
    expect(persisted).not.toContain("returned-secret");
  });

  it.each([
    { target: "mcp", clientId: "   ", registrationEndpoint: "https://ticktick.com/register" },
    { target: "mcp", clientId: "client", registrationEndpoint: "" },
    { target: "mcp", clientId: "client", registrationEndpoint: "not a url" },
    {
      target: "mcp",
      clientId: "client",
      registrationEndpoint: "https://api.ticktick.com/oauth/register",
      extra: "unexpected",
    },
  ])("fails closed for stale stored registration %#", async (stale) => {
    const storage = new MemoryStorage();
    storage.values.set("ticktick.oauth.public-client.v2.mcp", JSON.stringify(stale));
    const store = new OAuthClientRegistrationStore(storage);

    await expect(
      store.getOrRegister("mcp", "https://api.ticktick.com/oauth/register", async () => "  fresh-client  ")
    ).resolves.toBe("fresh-client");
    expect(JSON.parse(storage.values.get("ticktick.oauth.public-client.v2.mcp") ?? "{}")).toEqual({
      target: "mcp",
      clientId: "fresh-client",
      registrationEndpoint: "https://api.ticktick.com/oauth/register",
    });
  });
});
