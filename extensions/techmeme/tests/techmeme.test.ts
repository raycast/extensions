import { afterEach, expect, test } from "vitest";
import {
  fetchTechmeme,
  fetchTechmemeRiver,
  formatStoryDetailMarkdown,
  parseTechmemeHtml,
  parseTechmemeRiverHtml,
  type Story,
} from "../src/lib/techmeme";

const lastUpdated = new Date("2026-05-29T00:00:00.000Z");
const originalFetch = globalThis.fetch;

const riverHtml = String.raw`
  <div id="countercol">
    <h2>May 29, 2026</h2>
    <table>
      <tr class="ritem">
        <td>&bull; 2:10 PM</td>
        <td>
          <cite>Reporter One / <a href="https://source.example">Example Source</a>:</cite>
          <a href="https://example.com/lead">Lead story headline that is intentionally descriptive</a>
          <span class="rshr" pml="260529p1" twurl="https://x.com/techmeme/status/1"></span>
        </td>
      </tr>
      <tr class="ritem">
        <td>&bull; 1:05 PM</td>
        <td>
          <cite><a href="https://solo.example">Solo Source</a>:</cite>
          <a href="/260529/p2">Standalone river headline</a>
          <span class="rshr" pml="260529p2"></span>
        </td>
      </tr>
    </table>
  </div>
`;

const frontpageHtml = String.raw`
  <div class="clus">
    <div class="itc1">
      <div class="itc2">
        <div class="item" id="260529i1">
          <table><tr><td><cite>Reporter One / <a href="https://source.example">Example Source</a>:</cite></td></tr></table>
          <div class="ii">
            <strong><a href="https://example.com/lead">Lead story headline that is intentionally descriptive</a></strong>
            &mdash; The lead summary should be captured without the heading.
            <span pml="260529p1" twurl="https://x.com/techmeme/status/1" bsurl="https://bsky.app/profile/techmeme.com/post/1"></span>
          </div>
          <div id="260529p1">
            <div class="dbpt">
              <span class="drhed">More:</span>
              <div class="di">
                <cite>Reporter Two / <a href="https://related.example">Related Source</a>:</cite>
                <a href="https://related.example/story">Related coverage headline</a>
              </div>
            </div>
            <div class="dbpt">
              <span class="drhed">X:</span>
              <div class="di">
                <cite>@source:</cite>
                <a href="https://x.com/source/status/1">Social reaction headline</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="relitems">
      <div class="itc1">
        <div class="itc2">
          <div class="item" id="260529i3">
            <table><tr><td><cite><a href="https://sub.example">Sub Source</a>:</cite></td></tr></table>
            <div class="ii">
              <strong><a href="https://sub.example/story">Sub-story headline keeps its own selectable row</a></strong>
              <span pml="260529p3"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="clus">
    <div class="itc1">
      <div class="itc2">
        <div class="item" id="260529i4">
          <table><tr><td><cite>Standalone Source:</cite></td></tr></table>
          <div class="ii">
            <strong><a href="https://standalone.example/story">Standalone front page story</a></strong>
            <span pml="260529p4"></span>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("parses front page clusters without folding standalone stories into the cluster", () => {
  const data = parseTechmemeHtml(frontpageHtml, riverHtml, lastUpdated);

  expect(data.lastUpdated).toBe("2026-05-29T00:00:00.000Z");
  expect(data.frontpage.map((story) => story.headline)).toEqual([
    "Lead story headline that is intentionally descriptive",
    "Sub-story headline keeps its own selectable row",
    "Standalone front page story",
  ]);
  expect(data.frontpage.map((story) => [story.clusterRank, story.clusterPosition, story.clusterSize])).toEqual([
    [1, 1, 2],
    [1, 2, 2],
    [2, 1, 1],
  ]);
});

test("enriches front page stories with river timestamps, related links, and social links", () => {
  const data = parseTechmemeHtml(frontpageHtml, riverHtml, lastUpdated);
  const lead = data.frontpage[0];

  expect(lead.publishedAt).toBe("2026-05-29T18:10:00.000Z");
  expect(lead.publishedLabel).toContain("2026");
  expect(lead.summary).toBe("The lead summary should be captured without the heading.");
  expect(lead.sections).toHaveLength(2);
  expect(lead.sections[0]).toMatchObject({
    title: "More",
    links: [{ title: "Related coverage headline", url: "https://related.example/story" }],
  });
  expect(lead.social).toMatchObject({
    x: "https://x.com/techmeme/status/1",
    bluesky: "https://bsky.app/profile/techmeme.com/post/1",
  });
});

test("parses the river without requiring front page markup", () => {
  const data = parseTechmemeRiverHtml(riverHtml, lastUpdated);

  expect(data.frontpage).toEqual([]);
  expect(data.river).toHaveLength(2);
  expect(data.river[0]).toMatchObject({
    id: "260529p1",
    articleUrl: "https://example.com/lead",
    permalink: "https://www.techmeme.com/260529/p1#a260529p1",
    source: "Reporter One / Example Source",
    publishedAt: "2026-05-29T18:10:00.000Z",
  });
  expect(data.river[1].articleUrl).toBe("https://www.techmeme.com/260529/p2");
});

test("skips malformed and non-http URLs instead of aborting the parse", () => {
  const hostileFrontpageHtml = String.raw`
    <div class="clus">
      <div class="itc1">
        <div class="itc2">
          <div class="item" id="260529i1">
            <table><tr><td><cite>Safe Source:</cite></td></tr></table>
            <div class="ii">
              <strong><a href="https://safe.example/story">Safe story survives bad neighbors</a></strong>
              &mdash; - Repeated separators are cleaned.
              <span pml="260529p1" twurl="javascript:alert(1)" bsurl="http://[::1"></span>
              <img class="ill" src="http://[::1">
            </div>
            <div id="260529p1">
              <div class="dbpt">
                <span class="drhed">More:</span>
                <div class="di"><cite>Bad:</cite><a href="http://[::1">Bad malformed URL</a></div>
                <div class="di"><cite>Unsafe:</cite><a href="javascript:alert(1)">Bad scheme URL</a></div>
                <div class="di"><cite>Good:</cite><a href="https://safe.example/related">Good related URL</a></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="clus">
      <div class="itc1">
        <div class="itc2">
          <div class="item" id="260529i2">
            <table><tr><td><cite>Bad Source:</cite></td></tr></table>
            <div class="ii">
              <strong><a href="http://[::1">This malformed story is skipped</a></strong>
              <span pml="260529p2"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const data = parseTechmemeHtml(hostileFrontpageHtml, "", lastUpdated);

  expect(data.frontpage).toHaveLength(1);
  expect(data.frontpage[0].headline).toBe("Safe story survives bad neighbors");
  expect(data.frontpage[0].summary).toBe("Repeated separators are cleaned.");
  expect(data.frontpage[0].imageUrl).toBeUndefined();
  expect(data.frontpage[0].social.x).toBeUndefined();
  expect(data.frontpage[0].social.bluesky).toBeUndefined();
  expect(data.frontpage[0].sections[0].links).toEqual([
    { title: "Good related URL", url: "https://safe.example/related", source: "Good" },
  ]);
});

test("removes embed and media chrome from story details", () => {
  const mediaChromeHtml = String.raw`
    <div class="clus">
      <div class="itc1">
        <div class="itc2">
          <div class="item" id="260529i1">
            <table><tr><td><cite>Media Source:</cite></td></tr></table>
            <div class="ii">
              <strong><a href="https://media.example/story">Story with media chrome</a></strong>
              Video Player is loading. — Unmute — Current Time 0:01 Loaded: 17.77% Playback Rate — captions off, selected — English
              <span pml="260529p1"></span>
            </div>
            <div id="260529p1">
              <div class="dbpt">
                <span class="drhed">X:</span>
                <div class="di"><cite>Poster:</cite><a href="https://x.com/poster/status/1">Useful social text [video]</a></div>
                <div class="di"><cite>Poster:</cite><a href="https://bsky.app/profile/poster/post/1">Another useful post [embedded post]</a></div>
                <div class="di"><cite>Poster:</cite><a href="https://x.com/poster/status/2">Screenshot context [image]</a></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const [story] = parseTechmemeHtml(mediaChromeHtml, "", lastUpdated).frontpage;
  const markdown = formatStoryDetailMarkdown(story);

  expect(story.summary).toBeUndefined();
  expect(story.sections[0].links.map((link) => link.title)).toEqual([
    "Useful social text",
    "Another useful post",
    "Screenshot context",
  ]);
  expect(markdown).not.toMatch(/embedded post|Video Player is loading|\[video\]|\[image\]/i);
});

test("escapes markdown-looking story detail text without breaking valid links", () => {
  const story: Story = {
    id: "260529p9",
    rank: 1,
    headline: "# [Breaking](https://bad.example) *AI*",
    articleUrl: "https://example.com/story?x=(y)",
    permalink: "https://www.techmeme.com/260529/p9#a260529p9",
    source: "Example_Source",
    summary: "- item\n> quote\n![image](https://bad.example/image.png)",
    sections: [
      {
        title: "> More",
        links: [{ title: "[related](https://bad.example)", url: "https://example.com/related?x=(y)" }],
      },
    ],
    social: {},
  };

  const markdown = formatStoryDetailMarkdown(story);

  expect(markdown).toContain("\\# \\[Breaking\\](https://bad.example) \\*AI\\*");
  expect(markdown).toContain("\\- item");
  expect(markdown).toContain("\\> quote");
  expect(markdown).toContain("!\\[image\\](https://bad.example/image.png)");
  expect(markdown).toContain("[Original story](<https://example.com/story?x=(y)>)");
  expect(markdown).toContain("[\\[related\\](https://bad.example)](<https://example.com/related?x=(y)>)");
});

test("converts Techmeme Eastern 12 AM and 12 PM river times correctly", () => {
  const noonBoundaryRiverHtml = String.raw`
    <div id="countercol">
      <h2>March 8, 2026</h2>
      <table>
        <tr class="ritem">
          <td>&bull; 12:00 AM</td>
          <td><cite>Night:</cite><a href="https://example.com/midnight">Midnight</a><span class="rshr" pml="260308p1"></span></td>
        </tr>
        <tr class="ritem">
          <td>&bull; 12:00 PM</td>
          <td><cite>Noon:</cite><a href="https://example.com/noon">Noon</a><span class="rshr" pml="260308p2"></span></td>
        </tr>
      </table>
      <h2>November 1, 2026</h2>
      <table>
        <tr class="ritem">
          <td>&bull; 12:30 AM</td>
          <td><cite>Before fallback:</cite><a href="https://example.com/before">Before fallback</a><span class="rshr" pml="261101p1"></span></td>
        </tr>
        <tr class="ritem">
          <td>&bull; 3:30 AM</td>
          <td><cite>After fallback:</cite><a href="https://example.com/after">After fallback</a><span class="rshr" pml="261101p2"></span></td>
        </tr>
      </table>
    </div>
  `;

  const data = parseTechmemeRiverHtml(noonBoundaryRiverHtml, lastUpdated);

  expect(data.river.map((story) => story.publishedAt)).toEqual([
    "2026-03-08T05:00:00.000Z",
    "2026-03-08T16:00:00.000Z",
    "2026-11-01T04:30:00.000Z",
    "2026-11-01T08:30:00.000Z",
  ]);
});

test("front page fetch does not wait for a hanging river endpoint", async () => {
  globalThis.fetch = mockTechmemeFetch({
    home: immediateHtml(frontpageHtml),
    river: hangingHtml(),
  });
  const start = Date.now();

  const data = await fetchTechmeme();

  expect(Date.now() - start).toBeLessThan(3_000);
  expect(data.frontpage).toHaveLength(3);
  expect(data.river).toEqual([]);
});

test("river fetch does not wait for hanging front page enrichment", async () => {
  globalThis.fetch = mockTechmemeFetch({
    home: hangingHtml(),
    river: immediateHtml(riverHtml),
  });
  const start = Date.now();

  const data = await fetchTechmemeRiver();

  expect(Date.now() - start).toBeLessThan(3_000);
  expect(data.frontpage).toEqual([]);
  expect(data.river).toHaveLength(2);
});

test("front page fetch falls back to late river data when home fails", async () => {
  globalThis.fetch = mockTechmemeFetch({
    home: Promise.resolve(new Response("nope", { status: 500 })),
    river: delayedHtml(riverHtml, 1_600),
  });

  const data = await fetchTechmeme();

  expect(data.frontpage).toEqual([]);
  expect(data.river).toHaveLength(2);
});

function mockTechmemeFetch(responses: { home: Promise<Response>; river: Promise<Response> }): typeof fetch {
  return ((input: RequestInfo | URL) => {
    const url = input.toString();

    if (url === "https://www.techmeme.com/") {
      return responses.home;
    }

    if (url === "https://www.techmeme.com/river") {
      return responses.river;
    }

    return Promise.reject(new Error(`Unexpected URL ${url}`));
  }) as typeof fetch;
}

function immediateHtml(html: string): Promise<Response> {
  return Promise.resolve(new Response(html, { status: 200 }));
}

function hangingHtml(): Promise<Response> {
  return new Promise(() => undefined);
}

function delayedHtml(html: string, delayMs: number): Promise<Response> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(new Response(html, { status: 200 })), delayMs);
  });
}
