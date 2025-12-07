// D&D Beyond fetch utility tests

import { fetchDdbCharacter } from "../src/utils/ddb-fetch";

// Mock global fetch
global.fetch = jest.fn();

describe("fetchDdbCharacter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should fetch character data successfully", async () => {
    const mockJsonData = JSON.stringify({
      data: {
        id: 12345,
        name: "Test Character",
        stats: [],
      },
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => mockJsonData,
    });

    const result = await fetchDdbCharacter("12345");

    expect(result).toBe(mockJsonData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("should use proxy URL with encoded API URL", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{}",
    });

    await fetchDdbCharacter("12345");

    const callUrl = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(callUrl).toContain("try.dicelab.dev/corsproxy");
    expect(callUrl).toContain("apiurl=");
    expect(callUrl).toContain("character-service.dndbeyond.com");
  });

  test("should throw on HTTP 404 error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "",
    });

    await expect(fetchDdbCharacter("99999")).rejects.toThrow("HTTP 404");
    await expect(fetchDdbCharacter("99999")).rejects.toThrow("Not Found");
  });

  test("should throw on HTTP 500 error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "",
    });

    await expect(fetchDdbCharacter("12345")).rejects.toThrow("HTTP 500");
  });

  test("should throw on empty response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
    });

    await expect(fetchDdbCharacter("12345")).rejects.toThrow("empty response");
  });

  test("should throw on whitespace-only response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "   \n\t  ",
    });

    await expect(fetchDdbCharacter("12345")).rejects.toThrow("empty response");
  });

  test("should handle network errors", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new TypeError("fetch failed")
    );

    await expect(fetchDdbCharacter("12345")).rejects.toThrow(
      "Network error: Unable to connect to D&D Beyond"
    );
  });

  test("should preserve original error for non-network errors", async () => {
    const customError = new Error("Custom error message");
    (global.fetch as jest.Mock).mockRejectedValue(customError);

    await expect(fetchDdbCharacter("12345")).rejects.toThrow("Custom error message");
  });

  test("should include character ID in error messages", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () => "",
    });

    await expect(fetchDdbCharacter("67890")).rejects.toThrow("67890");
  });
});
