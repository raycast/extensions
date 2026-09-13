import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decode, formatDate, parseArchive, parseArticles, toArticleMarkdown, toIssueMarkdown } from "../src/content";

// npm test always runs from the extension root, so fixtures resolve from cwd
const fixture = (name: string) => readFileSync(join(process.cwd(), "__tests__/fixtures", name), "utf8");

describe("decode", () => {
  it("decodes named entities", () => {
    expect(decode("a &amp; b &lt;c&gt; &quot;q&quot; &#39;x&#39; &nbsp;")).toBe('a & b <c> "q" \'x\'  ');
  });
  it("decodes numeric entities (review fix)", () => {
    expect(decode("it&#8217;s")).toBe("it’s");
    expect(decode("&#x27;hi&#x27;")).toBe("'hi'");
  });
  it("does not double-decode (review fix)", () => {
    expect(decode("&amp;lt;")).toBe("&lt;");
  });
  it("leaves out-of-range numerics alone", () => {
    expect(decode("&#99999999;")).toBe("&#99999999;");
  });
  it("leaves lone surrogates raw instead of crashing (review fix)", () => {
    expect(decode("&#xD800;")).toBe("&#xD800;");
    expect(decode("&#55296;")).toBe("&#55296;");
  });
});

describe("formatDate", () => {
  it("formats ISO dates without timezone shift", () => {
    expect(formatDate("2026-09-06")).toBe("Sep 06 2026");
  });
  it("returns invalid months raw instead of 'undefined' (review fix)", () => {
    expect(formatDate("2024-13-01")).toBe("2024-13-01");
    expect(formatDate("2024-00-01")).toBe("2024-00-01");
  });
});

describe("parseArchive", () => {
  it("extracts issues with dates", () => {
    const html = `<ul class="archive-list">
<li class="clearfix"><span>2026-09-06</span><h3><a href="/issues/issue-743">Issue #743</a></h3></li>
<li class="clearfix"><span>2011-10-28</span><h3><a href="/issues/issue-1">Issue #1</a></h3></li></ul>`;
    const issues = parseArchive(html);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toEqual({
      number: "743",
      title: "Android Weekly Issue #743",
      url: "https://androidweekly.net/issues/issue-743",
      date: "2026-09-06",
    });
    expect(issues[1].number).toBe("1");
  });
  it("returns [] on redesigned pages so callers can raise drift errors", () => {
    expect(parseArchive("<p>redesigned</p>")).toEqual([]);
    expect(parseArticles("<p>redesigned</p>")).toEqual([]);
  });
});

describe("parseArticles", () => {
  const html = `<span style="font-size: 18px; color: #fff;">Articles & Tutorials</span>
<a href="https://example.com/a" target="_blank" style="font-size: 16px;">
Real article<span class="main-url" style="color: #333;">
</span></a></div><div>First description</div>
<a href="https://androidweekly.net/jobs/new" target="_blank">Ad</a></div><div>House ad</div>
<a href="https://example.com/b">Second</a></div><div>Second description</div>`;

  it("matches anchors whose span crosses newlines (dotall review fix)", () => {
    expect(parseArticles(html).map((a) => a.title)).toEqual(["Real article", "Second"]);
  });
  it("skips house ads and assigns sections", () => {
    const articles = parseArticles(html);
    expect(articles).toHaveLength(2);
    expect(articles[0].section).toBe("Articles & Tutorials");
    expect(articles[0].description).toBe("First description");
  });
});

describe("real-page fixtures (review fix)", () => {
  it("parses verbatim archive markup", () => {
    const html = fixture("archive.html");
    const issues = parseArchive(html);
    expect(issues).toHaveLength(2);
    expect(issues[0].number).toBe("743");
    expect(issues[0].date).toBe("2026-09-06");
  });
  it("parses verbatim issue markup, skipping the house ad", () => {
    const html = fixture("issue.html");
    const articles = parseArticles(html);
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe("Android's Restore Credentials API, Explained From Zero");
    expect(articles[0].section).toBe("Articles & Tutorials");
  });
});
describe("markdown builders", () => {
  it("escapes brackets so titles can't inject markdown (review fix)", () => {
    const md = toArticleMarkdown({ title: "A [hack](http://evil)", url: "https://example.com", description: "d [x]", section: "News" });
    expect(md).toContain("# A \\[hack\\](http://evil)");
    expect(md).toContain("d \\[x\\]");
  });
  it("escapes emphasis/heading chars and angle-wraps URLs (review fix)", () => {
    const md = toArticleMarkdown({
      title: "a *b* _c_ `d` #e <f>",
      url: "https://example.com/a_(b)",
      description: "plain",
      section: "News",
    });
    expect(md).toContain("# a \\*b\\* \\_c\\_ \\`d\\` \\#e \\<f\\>");
    expect(md).toContain("](<https://example.com/a_(b)>)");
  });
  it("strips angle brackets from URLs and escapes hostile sections (review fix)", () => {
    const md = toIssueMarkdown(
      { number: "1", title: "I", url: "https://androidweekly.net/issues/issue-1", date: "2011-10-28" },
      [{ title: "T", url: "https://example.com/a>b", description: "D", section: "A #B#\nC" }],
    );
    expect(md).toContain("](<https://example.com/ab>)");
    expect(md).toContain("## A \\#B\\#\nC");
  });
  it("renders full issue grouped by section", () => {
    const md = toIssueMarkdown(
      { number: "743", title: "Android Weekly Issue #743", url: "https://androidweekly.net/issues/issue-743", date: "2026-09-06" },
      [{ title: "T", url: "https://example.com", description: "D", section: "News" }],
    );
    expect(md).toContain("# Android Weekly Issue #743");
    expect(md).toContain("Sep 06 2026");
    expect(md).toContain("## News");
    expect(md).toContain("### [T](<https://example.com>)");
  });
});
