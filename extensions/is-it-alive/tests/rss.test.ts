import { afterEach, describe, expect, it, vi } from "vitest";

import { rssAdapter } from "@/adapters/rss";

afterEach(() => {
  vi.unstubAllGlobals();
});

const FEED = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>DeepSeek Status</title>
  <link>https://status.deepseek.com</link>
  <item>
    <title>[API] Errors &amp; timeouts</title>
    <guid>cdata-resolved</guid>
    <pubDate>Mon, 19 Oct 2026 10:00:00 GMT</pubDate>
    <description><![CDATA[<h3>Status: RESOLVED</h3>]]></description>
  </item>
  <item>
    <title>[Web] Slow pages</title>
    <guid>entity-resolved</guid>
    <pubDate>Mon, 19 Oct 2026 11:00:00 GMT</pubDate>
    <description>&lt;p&gt;&lt;strong&gt;Status:&lt;/strong&gt; resolved&lt;/p&gt;</description>
  </item>
  <item>
    <title>[API] Login fails</title>
    <guid>entity-active</guid>
    <pubDate>Tue, 20 Oct 2026 09:00:00 GMT</pubDate>
    <description>&lt;p&gt;&lt;strong&gt;Status:&lt;/strong&gt; investigating&lt;/p&gt;</description>
  </item>
</channel></rss>`;

describe("rssAdapter", () => {
  it("reads the status from CDATA and entity-encoded HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(FEED)),
    );

    const snapshot = await rssAdapter.fetchSnapshot({
      url: "https://status.deepseek.com/feed.xml",
      includeHistory: true,
    });

    expect(snapshot.pageName).toBe("DeepSeek");
    expect(snapshot.indicator).toBe("minor");
    expect(snapshot.incidents.map((incident) => incident.id)).toEqual([
      "entity-active",
    ]);
    expect(snapshot.incidents[0]).toMatchObject({
      name: "[API] Login fails",
      status: "investigating",
    });
    expect(
      snapshot.components.map(({ name, status }) => ({ name, status })),
    ).toEqual([
      { name: "API", status: "degraded_performance" },
      { name: "Web", status: "operational" },
    ]);
  });
});
