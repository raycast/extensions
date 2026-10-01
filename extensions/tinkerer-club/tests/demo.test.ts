import { describe, expect, it, vi } from "vitest";
import { TinkererApiClient } from "../src/api/client";
import { TinkererArticles } from "../src/api/articles";
import { TinkererCommunity } from "../src/api/community";
import { demoFetch } from "../src/api/demo";
import { parsePromptDisplay } from "../src/lib/prompt";
import { toDisplayItems } from "../src/lib/results";

const client = new TinkererApiClient({ apiKey: "demo-only", baseUrl: "https://app.tinkerer.club" }, demoFetch);

describe("screenshot demo data", () => {
  it("renders fictional feed and article content without using the network", async () => {
    const network = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("Live network must not be used in demo mode");
    });
    try {
      const feed = await new TinkererCommunity(client).feed(8);
      const articles = await new TinkererArticles(client).list("published");
      expect(feed.posts).toHaveLength(8);
      expect(feed.posts[0]?.author.username).toContain("demo");
      expect(feed.posts[0]?.commentCount).toBeGreaterThan(0);
      expect(articles.length).toBeGreaterThanOrEqual(4);
      expect(articles[0]?.title).toBeTruthy();
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });

  it("loads an actual demo conversation and prompts", async () => {
    const community = new TinkererCommunity(client);
    const thread = await community.thread("demo-post-1");
    expect(thread.post).toMatchObject({ id: "demo-post-1" });
    expect(await community.comments("demo-post-1")).toHaveLength(3);

    const result = await client.call(
      { path: "prompt.list", type: "query" },
      { limit: 60, page: 1, sort: "POPULAR", view: "EXPLORE" },
    );
    const prompts = toDisplayItems(result, client.baseUrl).map((item, index) =>
      parsePromptDisplay(item.value, index, client.baseUrl),
    );
    expect(prompts.length).toBeGreaterThanOrEqual(5);
    expect(prompts[0]?.content).toContain("{{notes}}");
  });

  it("rejects unknown procedures locally", async () => {
    await expect(client.call({ path: "unknown.action", type: "mutation" }, {})).rejects.toThrow(
      "No live request was sent",
    );
  });
});
