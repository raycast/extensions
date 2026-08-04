import { createSecretFlow, viewSecretFlow } from "../crypto-flows";
import { ApiError, ValidationError } from "../errors";

const HOST = "https://test.vaulted.fyi";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("createSecretFlow + viewSecretFlow roundtrip", () => {
  it("roundtrips plaintext through encrypt → decrypt (no passphrase)", async () => {
    const plaintext = "db_password=hunter2";
    let capturedBody:
      | { ciphertext: string; iv: string; hasPassphrase: boolean }
      | undefined;
    const capturedId = "abc123";

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        capturedBody = JSON.parse(init.body as string);
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: capturedId, statusToken: "tok" }),
        });
      }
      if (
        url === `${HOST}/api/secrets/${capturedId}` &&
        init?.method === "GET"
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ciphertext: capturedBody!.ciphertext,
            iv: capturedBody!.iv,
            hasPassphrase: capturedBody!.hasPassphrase,
            viewsRemaining: 0,
          }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    const created = await createSecretFlow({
      plaintext,
      host: HOST,
      views: 1,
      expiry: "24h",
    });
    expect(created.url).toMatch(
      new RegExp(`^${HOST}/s/abc123#[A-Za-z0-9_-]+$`),
    );

    const viewed = await viewSecretFlow({ url: created.url });
    expect(viewed.plaintext).toBe(plaintext);
  });

  it("roundtrips plaintext through encrypt → decrypt (with passphrase)", async () => {
    const plaintext = "api-key-secret-value";
    const passphrase = "horse battery staple";
    let capturedBody:
      | { ciphertext: string; iv: string; hasPassphrase: boolean }
      | undefined;
    const capturedId = "xyz";

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        capturedBody = JSON.parse(init.body as string);
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: capturedId, statusToken: "tok" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ciphertext: capturedBody!.ciphertext,
          iv: capturedBody!.iv,
          hasPassphrase: true,
          viewsRemaining: 0,
        }),
      });
    });

    const created = await createSecretFlow({
      plaintext,
      host: HOST,
      views: 1,
      expiry: "1h",
      passphrase,
    });

    // Fragment must contain a dot separator for wrappedKey.salt
    const fragment = created.url.split("#")[1];
    expect(fragment).toContain(".");

    const viewed = await viewSecretFlow({ url: created.url, passphrase });
    expect(viewed.plaintext).toBe(plaintext);
  });
});

describe("createSecretFlow validation", () => {
  it("rejects empty plaintext", async () => {
    await expect(
      createSecretFlow({ plaintext: "", host: HOST, views: 1, expiry: "24h" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects oversize plaintext", async () => {
    await expect(
      createSecretFlow({
        plaintext: "x".repeat(1001),
        host: HOST,
        views: 1,
        expiry: "24h",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("passes maxViews and ttl to API", async () => {
    let captured: Record<string, unknown> = {};
    mockFetch.mockImplementation((_url, init?: RequestInit) => {
      captured = JSON.parse(init!.body as string);
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: "x", statusToken: "y" }),
      });
    });
    await createSecretFlow({
      plaintext: "secret",
      host: HOST,
      views: 5,
      expiry: "7d",
    });
    expect(captured.maxViews).toBe(5);
    expect(captured.ttl).toBe(604800);
    expect(captured.hasPassphrase).toBe(false);
  });
});

describe("viewSecretFlow validation", () => {
  it("rejects malformed URL", async () => {
    await expect(viewSecretFlow({ url: "not a url" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects URL without fragment", async () => {
    await expect(
      viewSecretFlow({ url: "https://vaulted.fyi/s/abc" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws PASSPHRASE_REQUIRED when passphrase is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ciphertext: "c",
        iv: "i",
        hasPassphrase: true,
        viewsRemaining: 0,
      }),
    });
    try {
      await viewSecretFlow({ url: "https://vaulted.fyi/s/abc#wrapped.salt" });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).code).toBe("PASSPHRASE_REQUIRED");
    }
  });

  it("throws ENCRYPTION_FAILED on key/IV mismatch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ciphertext: "AAAAAAAAAAAAAAAAAAAAAA",
        iv: "AAAAAAAAAAAAAAAA",
        hasPassphrase: false,
        viewsRemaining: 0,
      }),
    });
    try {
      // Random 32-byte key won't decrypt the above bogus ciphertext
      const bogusKey = "A".repeat(43);
      await viewSecretFlow({ url: `https://vaulted.fyi/s/abc#${bogusKey}` });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("ENCRYPTION_FAILED");
    }
  });
});
