import { shortenWithBitly } from "../../services/bitly";
import { shortenWithCuttly } from "../../services/cuttly";
import { shortenWithIsgd } from "../../services/isgd";
import { shortenWithTinyurl } from "../../services/tinyurl";
import { shortenWithVgd } from "../../services/vgd";

let fetchMock: ReturnType<typeof vi.fn>;
let originalFetch: typeof global.fetch;

beforeEach(() => {
  originalFetch = global.fetch;
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("shortenWithBitly", () => {
  it("returns the shortened link on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ link: "https://bit.ly/abc123" }),
    });

    const result = await shortenWithBitly("https://example.com", "test-key");
    expect(result).toBe("https://bit.ly/abc123");
  });

  it("sends a POST request to the bit.ly API", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ link: "https://bit.ly/abc123" }),
    });

    await shortenWithBitly("https://example.com", "test-key");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-ssl.bitly.com/v4/shorten",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends Bearer authorization header with the api key", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ link: "https://bit.ly/abc123" }),
    });

    await shortenWithBitly("https://example.com", "my-secret-key");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-secret-key",
        }),
      }),
    );
  });

  it("sends Content-Type application/json header", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ link: "https://bit.ly/abc123" }),
    });

    await shortenWithBitly("https://example.com", "test-key");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("sends long_url and domain in request body", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ link: "https://bit.ly/abc123" }),
    });

    await shortenWithBitly("https://example.com", "test-key");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          long_url: "https://example.com",
          domain: "bit.ly",
        }),
      }),
    );
  });

  it("throws an error containing the status code when response is not ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    await expect(
      shortenWithBitly("https://example.com", "bad-key"),
    ).rejects.toThrow("403");
  });
});

describe("shortenWithCuttly", () => {
  it("returns the shortLink when cutt.ly status is 7", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () =>
        Promise.resolve({
          url: { status: 7, shortLink: "https://cutt.ly/abc" },
        }),
    });

    const result = await shortenWithCuttly("https://example.com", "api-key");
    expect(result).toBe("https://cutt.ly/abc");
  });

  it("throws the status 1 message when link is from the shortening domain", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ url: { status: 1, shortLink: "" } }),
    });

    await expect(
      shortenWithCuttly("https://example.com", "api-key"),
    ).rejects.toThrow(
      "The shortened link comes from the domain that shortens the link",
    );
  });

  it("throws the status 4 message for invalid API key", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ url: { status: 4, shortLink: "" } }),
    });

    await expect(
      shortenWithCuttly("https://example.com", "bad-key"),
    ).rejects.toThrow("Invalid API key");
  });

  it("throws when the url field is missing from the response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({}),
    });

    await expect(
      shortenWithCuttly("https://example.com", "api-key"),
    ).rejects.toThrow("cutt.ly API returned an unexpected response");
  });

  it("includes a 7-character alphanumeric name parameter in the request URL", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () =>
        Promise.resolve({
          url: { status: 7, shortLink: "https://cutt.ly/abc" },
        }),
    });

    await shortenWithCuttly("https://example.com", "api-key");
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    const nameMatch = calledUrl.match(/[?&]name=([A-Za-z0-9]+)/);
    expect(nameMatch).not.toBeNull();
    expect(nameMatch![1]).toHaveLength(7);
  });
});

describe("shortenWithTinyurl", () => {
  it("returns the shortened URL text on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve("https://tinyurl.com/abc"),
    });

    const result = await shortenWithTinyurl("https://example.com");
    expect(result).toBe("https://tinyurl.com/abc");
  });

  it("throws an error containing the status code on server error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(shortenWithTinyurl("https://example.com")).rejects.toThrow(
      "500",
    );
  });
});

describe("shortenWithIsgd", () => {
  it("returns the shorturl on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ shorturl: "https://is.gd/abc" }),
    });

    const result = await shortenWithIsgd("https://example.com");
    expect(result).toBe("https://is.gd/abc");
  });

  it("throws with the errormessage when errorcode is present", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ errorcode: 1, errormessage: "some error" }),
    });

    await expect(shortenWithIsgd("https://example.com")).rejects.toThrow(
      "some error",
    );
  });

  it("throws when shorturl is missing from response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({}),
    });

    await expect(shortenWithIsgd("https://example.com")).rejects.toThrow(
      "is.gd API returned an unexpected response",
    );
  });
});

describe("shortenWithVgd", () => {
  it("returns the shorturl on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ shorturl: "https://v.gd/abc" }),
    });

    const result = await shortenWithVgd("https://example.com");
    expect(result).toBe("https://v.gd/abc");
  });

  it("throws with the errormessage when errorcode is present", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ errorcode: 2, errormessage: "bad url" }),
    });

    await expect(shortenWithVgd("https://example.com")).rejects.toThrow(
      "bad url",
    );
  });
});
