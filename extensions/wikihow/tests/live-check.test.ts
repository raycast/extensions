import { expect, it } from "vitest";
import { articleUrl, buildSearchUrl, searchArticles } from "../src/lib/wikihow";

const key = process.env.BRAVE_SEARCH_API_KEY;

it("reaches the official service and receives its documented key-required validation", async () => {
  const response = await fetch(buildSearchUrl("tie a tie", 0), {
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  expect(response.status).toBe(422);
  const body = await response.json();
  expect(body.error.meta.errors).toEqual(
    expect.arrayContaining([expect.objectContaining({ loc: ["header", "x-subscription-token"], type: "missing" })]),
  );
}, 20_000);

it.skipIf(!key)(
  "returns live wikiHow articles with an authorized personal key",
  async () => {
    const page = await searchArticles("tie a tie", 0, key || "");
    expect(page.articles.length).toBeGreaterThan(0);
    expect(page.articles.every((article) => articleUrl(article.url) === article.url)).toBe(true);
    expect(page.articles.some((article) => article.excerpt.length > 0)).toBe(true);
    // Do not print or persist API keys or live search excerpts.
  },
  20_000,
);
