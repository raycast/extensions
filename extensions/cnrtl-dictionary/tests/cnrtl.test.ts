import fetchMock from "jest-fetch-mock";
import * as fs from "fs";
import * as path from "path";
import {
  fetchCnrtlPage,
  fetchDefinition,
  fetchSynonyms,
  fetchAntonyms,
  fetchEtymology,
  fetchMorphology,
  isCnrtlError,
} from "../src/utils/cnrtl";

function fixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
}

// ─── isCnrtlError ─────────────────────────────────────────────────────────────

describe("isCnrtlError", () => {
  it("returns true for a well-formed CnrtlError", () => {
    const err = { type: "not_found", message: "msg", word: "foo", endpoint: "definition" };
    expect(isCnrtlError(err)).toBe(true);
  });

  it("returns false for a plain Error", () => {
    expect(isCnrtlError(new Error("oops"))).toBe(false);
  });

  it("returns false for null", () => {
    expect(isCnrtlError(null)).toBe(false);
  });

  it("returns false for a plain string", () => {
    expect(isCnrtlError("error")).toBe(false);
  });
});

// ─── fetchCnrtlPage ───────────────────────────────────────────────────────────

describe("fetchCnrtlPage", () => {
  it("returns HTML on successful 200 response", async () => {
    fetchMock.mockResponseOnce("<html><body>ok</body></html>");
    const html = await fetchCnrtlPage("definition", "maison");
    expect(html).toContain("ok");
  });

  it("throws a network CnrtlError on fetch failure", async () => {
    fetchMock.mockRejectOnce(new Error("Network failure"));
    await expect(fetchCnrtlPage("definition", "maison")).rejects.toMatchObject({
      type: "network",
      word: "maison",
      endpoint: "definition",
    });
  });

  it("throws a network CnrtlError on non-ok HTTP status", async () => {
    fetchMock.mockResponseOnce("Server error", { status: 500 });
    await expect(fetchCnrtlPage("definition", "maison")).rejects.toMatchObject({
      type: "network",
      endpoint: "definition",
    });
  });

  it("throws a not_found CnrtlError on HTTP 404", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(fetchCnrtlPage("definition", "xyzzy")).rejects.toMatchObject({
      type: "not_found",
      word: "xyzzy",
    });
  });

  it("throws a not_found CnrtlError when page contains 'aucune entrée'", async () => {
    fetchMock.mockResponseOnce(fixture("not-found.html"), { status: 200 });
    await expect(fetchCnrtlPage("definition", "xyzzy")).rejects.toMatchObject({
      type: "not_found",
    });
  });

  it("sends a User-Agent header", async () => {
    fetchMock.mockResponseOnce("<html>ok</html>");
    await fetchCnrtlPage("definition", "test");
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = call[1].headers as Record<string, string>;
    expect(headers["User-Agent"]).toMatch(/Mozilla/);
  });

  it("builds the correct URL", async () => {
    fetchMock.mockResponseOnce("<html>ok</html>");
    await fetchCnrtlPage("synonymie", "chat");
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toMatch(/cnrtl\.fr\/synonymie\/chat/);
  });

  it("URL-encodes words with accents", async () => {
    fetchMock.mockResponseOnce("<html>ok</html>");
    await fetchCnrtlPage("definition", "éclat");
    const [urlEncoded] = fetchMock.mock.calls[0] as unknown as [string];
    expect(urlEncoded).toMatch(/%C3%A9clat|éclat/i);
  });
});

// ─── fetchDefinition ─────────────────────────────────────────────────────────

describe("fetchDefinition", () => {
  it("returns a DefinitionEntry on success", async () => {
    fetchMock.mockResponseOnce(fixture("definition.html"));
    const result = await fetchDefinition("maison");
    expect(result.word).toBeTruthy();
    expect(Array.isArray(result.sections)).toBe(true);
    expect(result.url).toMatch(/definition/);
  });

  it("propagates not_found errors", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(fetchDefinition("xyzzy")).rejects.toMatchObject({ type: "not_found" });
  });

  it("propagates network errors", async () => {
    fetchMock.mockRejectOnce(new Error("timeout"));
    await expect(fetchDefinition("maison")).rejects.toMatchObject({ type: "network" });
  });
});

// ─── fetchSynonyms ────────────────────────────────────────────────────────────

describe("fetchSynonyms", () => {
  it("returns a SynonymResult on success", async () => {
    fetchMock.mockResponseOnce(fixture("synonyms.html"));
    const result = await fetchSynonyms("maison");
    expect(result.word).toBe("maison");
    expect(result.groups).toBeDefined();
    const all = result.groups.flatMap((g) => g.entries);
    expect(all.length).toBeGreaterThan(0);
  });

  it("propagates errors", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(fetchSynonyms("xyzzy")).rejects.toMatchObject({ type: "not_found" });
  });
});

// ─── fetchAntonyms ────────────────────────────────────────────────────────────

describe("fetchAntonyms", () => {
  it("returns a SynonymResult on success", async () => {
    fetchMock.mockResponseOnce(fixture("antonyms.html"));
    const result = await fetchAntonyms("vieux");
    expect(result.word).toBe("vieux");
    const all = result.groups.flatMap((g) => g.entries);
    expect(all.length).toBeGreaterThan(0);
  });
});

// ─── fetchEtymology ──────────────────────────────────────────────────────────

describe("fetchEtymology", () => {
  it("returns an EtymologyEntry on success", async () => {
    fetchMock.mockResponseOnce(fixture("etymology.html"));
    const result = await fetchEtymology("maison");
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.url).toMatch(/etymologie/);
  });
});

// ─── fetchMorphology ─────────────────────────────────────────────────────────

describe("fetchMorphology", () => {
  it("returns a MorphologyEntry on success", async () => {
    fetchMock.mockResponseOnce(fixture("morphology.html"));
    const result = await fetchMorphology("aimer");
    expect(result.word).toBe("aimer");
    expect(Array.isArray(result.forms)).toBe(true);
  });
});
