import { createSecret, retrieveSecret, USER_AGENT } from "../api-client";
import { ApiError } from "../errors";

const HOST = "https://test.vaulted.fyi";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const validCreateParams = {
  ciphertext: "encrypted-data",
  iv: "init-vector",
  maxViews: 3,
  ttl: 86400,
  hasPassphrase: false,
};

describe("createSecret", () => {
  it("returns { id, statusToken } on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "abc", statusToken: "tok" }),
    });
    const result = await createSecret(HOST, validCreateParams);
    expect(result).toEqual({ id: "abc", statusToken: "tok" });
  });

  it("POSTs to {host}/api/secrets with JSON body and User-Agent", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "x", statusToken: "y" }),
    });
    await createSecret(HOST, validCreateParams);
    expect(mockFetch).toHaveBeenCalledWith(
      `${HOST}/api/secrets`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(validCreateParams),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
      }),
    );
  });

  it("USER_AGENT identifies the Raycast client", () => {
    expect(USER_AGENT).toMatch(/^vaulted-raycast\/\d+\.\d+\.\d+/);
  });

  it("surfaces server error.message into ApiError.message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "Secret exceeds 1000 chars" }),
    });
    try {
      await createSecret(HOST, validCreateParams);
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as ApiError).message).toBe("Secret exceeds 1000 chars");
    }
  });

  it("surfaces server message field when error field is absent", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ message: "please upgrade to v1.1" }),
    });
    try {
      await createSecret(HOST, validCreateParams);
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as ApiError).message).toBe("please upgrade to v1.1");
    }
  });

  it("falls back to generic message when server body has no message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ someUnexpectedShape: true }),
    });
    try {
      await createSecret(HOST, validCreateParams);
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as ApiError).message).toBe("Vaulted API returned 500");
    }
  });

  it("throws ApiError(API_UNREACHABLE, 0) on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(createSecret(HOST, validCreateParams)).rejects.toMatchObject({
      name: "ApiError",
      status: 0,
      code: "API_UNREACHABLE",
    });
  });

  it("throws ApiError(INVALID_INPUT, 400) on 400 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "bad input" }),
    });
    try {
      await createSecret(HOST, validCreateParams);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(400);
      expect((err as ApiError).code).toBe("INVALID_INPUT");
      expect((err as ApiError).body).toEqual({ error: "bad input" });
    }
  });

  it("throws ApiError(API_UNREACHABLE, 500) on 500 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "internal error",
    });
    try {
      await createSecret(HOST, validCreateParams);
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as ApiError).status).toBe(500);
      expect((err as ApiError).code).toBe("API_UNREACHABLE");
    }
  });
});

describe("retrieveSecret", () => {
  it("returns { ciphertext, iv, hasPassphrase, viewsRemaining } on success", async () => {
    const payload = {
      ciphertext: "c",
      iv: "i",
      hasPassphrase: false,
      viewsRemaining: 2,
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => payload });
    expect(await retrieveSecret(HOST, "abc")).toEqual(payload);
  });

  it("GETs {host}/api/secrets/{id} with User-Agent", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ciphertext: "x",
        iv: "y",
        hasPassphrase: false,
        viewsRemaining: 1,
      }),
    });
    await retrieveSecret(HOST, "abc123");
    expect(mockFetch).toHaveBeenCalledWith(
      `${HOST}/api/secrets/abc123`,
      expect.objectContaining({
        method: "GET",
        headers: { "User-Agent": USER_AGENT },
      }),
    );
  });

  it("surfaces server error message on 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({ error: "Secret not found or expired" }),
    });
    try {
      await retrieveSecret(HOST, "gone");
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as ApiError).message).toBe("Secret not found or expired");
    }
  });

  it("throws ApiError(SECRET_NOT_FOUND, 404) on 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: "not found" }),
    });
    try {
      await retrieveSecret(HOST, "gone");
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as ApiError).status).toBe(404);
      expect((err as ApiError).code).toBe("SECRET_NOT_FOUND");
    }
  });

  it("throws ApiError(API_ERROR, 429) on rate-limit", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: "rate limited" }),
    });
    try {
      await retrieveSecret(HOST, "abc");
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as ApiError).status).toBe(429);
      expect((err as ApiError).code).toBe("API_ERROR");
    }
  });

  it("throws ApiError(API_UNREACHABLE, 0) on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
    try {
      await retrieveSecret(HOST, "abc");
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as ApiError).code).toBe("API_UNREACHABLE");
    }
  });

  it("captures plain-text error bodies", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => "bad gateway",
    });
    try {
      await retrieveSecret(HOST, "abc");
      expect.fail("should have thrown");
    } catch (err) {
      expect((err as ApiError).body).toBe("bad gateway");
    }
  });
});
