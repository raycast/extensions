// Run: npm test (Node 22.6+ strips the types; no extra packages). Pure logic only, plus one live check against the public API.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
    BUSY_MESSAGE,
    KEYS_URL,
    SEARCH_TTL_MS,
    type SearchDeps,
    loadTrust,
    retryAfterMs,
    searchAllWith,
    DOWNLOAD_ORDER,
    type ContentArticle,
    type ContentQuestion,
    type ContentTool,
    type Software,
    answerLabel,
    articleMarkdown,
    questionMarkdown,
    readingLabel,
    rowId,
    sectionsOf,
    slugOfRow,
    toolIconUrl,
    toolMarkdown,
    articleTypeLabel,
    articlesPath,
    day,
    downloadPlatforms,
    downloadUrl,
    detailMarkdown,
    effectiveSelection,
    imageUrl,
    escapeMd,
    loadDetail,
    logoUrl,
    oneLine,
    questionsPath,
    platformRows,
    shortSummary,
    softwareUrlOf,
    toolsPath,
    trustLine,
} from "../src/logic.ts";

const vlc: Software = {
    slug: "vlc-media-player",
    name: "VLC Media Player",
    url: "https://vlc-media-player.fileion.com",
    logo: "/curator/software/logos/2025/01/vlc-media-player-logo.jpg?w=96&h=96&fm=webp&s=b6",
    platforms: ["windows", "mac", "android", "ios", "linux"],
    latest: {
        windows: { id: 1313, version: "3.0.24", released_at: "2026-09-21" },
        mac: { id: 1314, version: "3.0.24", released_at: "2026-09-21" },
        android: { id: 177, version: "3.7.0", released_at: "2025-02-17" },
        ios: null,
        linux: { id: 1690, version: "3.0.24", released_at: "2026-09-17" },
    },
};

test("a loaded title's rows read '3.0.24 · Sep 21, 2026', and none stays '…'", () => {
    const rows = platformRows(vlc, "ready", vlc.latest);
    assert.equal(rows.find((r) => r.platform === "windows")?.text, "3.0.24 · Sep 21, 2026");
    assert.equal(rows.find((r) => r.platform === "mac")?.text, "3.0.24 · Sep 21, 2026");
    assert.equal(rows.find((r) => r.platform === "ios")?.text, "No version yet");
    assert.ok(rows.every((r) => r.text !== "…"));
});

test("loading says 'Loading' only while loading; an error says so instead of staying on it", () => {
    assert.ok(platformRows(vlc, "loading").every((r) => r.text === "Loading"));
    assert.ok(platformRows(vlc, "error").every((r) => r.text === "Could not load"));
});

test("the panel body has a Platform | Version | Released table with VLC's rows under a short summary", () => {
    const md = detailMarkdown(
        {
            ...vlc,
            summary: "VLC Media Player is a free and open-source media player. It plays everything, on every platform.",
        },
        "ready",
        vlc.latest,
    );
    assert.ok(
        md.startsWith(
            "# VLC Media Player\n\nVLC Media Player is a free and open-source media player.\n\n| Platform | Version | Released |\n| --- | --- | --- |\n",
        ),
    );
    assert.ok(md.includes("| Windows | 3.0.24 | Sep 21, 2026 |"));
    assert.ok(md.includes("| Mac | 3.0.24 | Sep 21, 2026 |"));
    assert.ok(md.includes("| Linux | 3.0.24 | Sep 17, 2026 |"));
    assert.ok(md.includes("| Android | 3.7.0 | Feb 17, 2025 |"));
    assert.ok(md.includes("| iOS | No version yet | - |"));
    assert.ok(!md.includes("It plays everything"), "only the first sentence");
    assert.ok(!md.includes("…"), "no row is an ellipsis");
});

test("values are escaped: a pipe, markup or a line break cannot break the table", () => {
    assert.equal(escapeMd("a | b\nc *x* `y` [z](u) <b>"), "a \\| b c \\*x\\* \\`y\\` \\[z\\]\\(u\\) \\<b\\>");
    const evil = {
        ...vlc,
        name: "Evil | App",
        summary: "Hi | there <script>alert(1)</script>. Second.",
        platforms: ["windows"],
        latest: { windows: { id: 1, version: "1.0 | beta", released_at: "2026-01-02" } },
    };
    const md = detailMarkdown(evil, "ready", evil.latest);
    assert.ok(md.startsWith("# Evil \\| App"));
    assert.ok(md.includes("| Windows | 1.0 \\| beta | Jan 2, 2026 |"));
    assert.ok(!md.includes("<script>") && !md.includes("<b>"));
    assert.equal(md.split("\n").filter((l) => l.startsWith("| Windows")).length, 1);
});

test("a summary is cut to its first sentence, or about 160 characters at a word", () => {
    assert.equal(shortSummary("One. Two."), "One.");
    assert.equal(shortSummary(null), "");
    const long = shortSummary("word ".repeat(100));
    assert.ok(long.length <= 161 && long.endsWith("…"));
});

test("loadDetail resolves with the versions, the trust line and the logo's title", async () => {
    const detail = await loadDetail("vlc-media-player", {
        getSoftware: async () => vlc,
        getVersion: async () => ({
            id: 1313,
            version: "3.0.24",
            url: "https://vlc-media-player.fileion.com/windows",
            trust: {
                ok: 3,
                steps: {
                    source: { status: "ok", text: "x" },
                    virustotal: { status: "ok", text: "0 of 68 engines flagged it" },
                },
            },
        }),
    });
    assert.equal(detail.platform, "windows");
    assert.equal(detail.trust, "Fileion checks: 3 of 2 · 0 of 68 engines flagged it");
    // a failing trust request does not lose the versions
    const noTrust = await loadDetail("vlc-media-player", {
        getSoftware: async () => vlc,
        getVersion: async () => {
            throw new Error("HTTP 500");
        },
    });
    assert.equal(noTrust.software.latest?.windows?.version, "3.0.24");
    assert.equal(noTrust.trust, undefined);
});

test("the selection falls back to the first result when Raycast reports none, or a stale one", () => {
    const slugs = ["a", "b", "c"];
    assert.equal(effectiveSelection(null, slugs), "a");
    assert.equal(effectiveSelection("c", slugs), "c");
    assert.equal(effectiveSelection("gone", slugs), "a");
    assert.equal(effectiveSelection("x", []), null);
});

test("downloads: Mac first, then Windows, Linux, Android, iOS; only platforms with a version; a preferred platform first", () => {
    assert.deepEqual(downloadPlatforms(vlc), ["mac", "windows", "linux", "android"]);
    assert.deepEqual(downloadPlatforms(vlc, "windows"), ["windows", "mac", "linux", "android"]);
    assert.deepEqual(downloadPlatforms({ platforms: ["windows", "linux"] }), ["windows", "linux"]);
    assert.deepEqual(
        downloadPlatforms({ platforms: ["windows"], latest: { windows: { id: 1, version: "1", released_at: null } } }),
        ["windows"],
    );
    assert.deepEqual(DOWNLOAD_ORDER, ["mac", "windows", "linux", "android", "ios"]);
});

test("a download action opens Fileion's own platform download page, never a vendor file", () => {
    assert.equal(
        downloadUrl("https://vlc-media-player.fileion.com", "mac"),
        "https://vlc-media-player.fileion.com/mac/download",
    );
    assert.equal(
        downloadUrl("https://vlc-media-player.fileion.com/", "windows"),
        "https://vlc-media-player.fileion.com/windows/download",
    );
});

test("the logo is made absolute; an update row finds its title's address", () => {
    assert.equal(
        logoUrl(vlc.logo),
        "https://fileion.com/curator/software/logos/2025/01/vlc-media-player-logo.jpg?w=96&h=96&fm=webp&s=b6",
    );
    assert.equal(logoUrl("https://cdn.example/x.png"), "https://cdn.example/x.png");
    assert.equal(logoUrl(null), undefined);
    assert.equal(logoUrl("javascript:alert(1)"), undefined);
    const update = {
        id: 1,
        version: "26.46.12",
        released_at: "2026-11-17",
        software: { slug: "whatsapp", name: "WhatsApp" },
        platform: "mac",
        url: "https://whatsapp.fileion.com/mac",
    };
    assert.equal(softwareUrlOf(update), "https://whatsapp.fileion.com");
    assert.equal(downloadUrl(softwareUrlOf(update), update.platform), "https://whatsapp.fileion.com/mac/download");
});

test("dates are 'Sep 21, 2026'; a trust line that claims safety is dropped", () => {
    assert.equal(day("2026-09-21"), "Sep 21, 2026");
    assert.equal(day("nonsense"), "");
    assert.equal(trustLine({ ok: 3, steps: { virustotal: { status: "ok", text: "This file is safe" } } }), undefined);
});

test("live: the public API gives VLC's platform rows in the shown format, and its logo path exists", async (t) => {
    let software: Software;
    try {
        software = (
            await (
                await fetch("https://fileion.com/api/v1/software/vlc-media-player", {
                    signal: AbortSignal.timeout(15000),
                })
            ).json()
        ).data;
    } catch {
        return t.skip("the public API is not reachable from here");
    }
    const rows = platformRows(software, "ready", software.latest);
    const windows = rows.find((r) => r.platform === "windows");
    assert.match(windows?.text ?? "", /^\d+(\.\d+)+ · [A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    assert.ok(rows.every((r) => r.text !== "…"));
    const logo = logoUrl(software.logo);
    assert.ok(logo?.startsWith("https://fileion.com/curator/"));
    assert.equal((await fetch(logo as string, { method: "HEAD" })).status, 200);
    assert.equal(
        (await fetch(downloadUrl(software.url, "windows"), { method: "HEAD", redirect: "manual" })).status < 400,
        true,
    );
});

// ---- Tools, Q&A and articles: fixtures that follow the content API contract (/api/v1/tools, /questions, /articles; PR #1140) ----

const toolFixture: ContentTool = {
    slug: "merge-pdf",
    name: "Merge PDF",
    summary: "Join several PDF files into one.",
    category: { slug: "pdf", title: "PDF Tools" },
    url: "https://tools.fileion.com/pdf/merge-pdf",
    image: "/curator/media/3f2c9d1e-aaaa-4bbb-8ccc-000000000001.jpg?w=480&h=270&fm=webp&s=abc123",
    icon_svg: null,
    updated_at: "2026-11-10T08:00:00+06:00",
};

const questionFixture: ContentQuestion = {
    slug: "how-to-install-vlc",
    title: "How to install VLC on Windows 11?",
    excerpt: "I downloaded the installer but it does not open.",
    answer_count: 3,
    accepted: true,
    url: "https://qna.fileion.com/question/how-to-install-vlc",
    created_at: "2026-11-17T10:30:00+06:00",
    software: { slug: "vlc-media-player", name: "VLC Media Player" },
};

const articleFixture: ContentArticle = {
    slug: "best-free-download-managers",
    title: "Best free download managers",
    excerpt: "Five managers compared.",
    type: "blog",
    topic: { slug: "guides", title: "Guides" },
    author: "Fileion Team",
    published_at: "2026-11-12T09:00:00+06:00",
    url: "https://fileion.com/blog/best-free-download-managers",
    image: "/curator/media/3f2c9d1e-aaaa-4bbb-8ccc-000000000002.jpg?w=640&h=360&fm=webp&s=def456",
};

const articleWithoutImage: ContentArticle = { ...articleFixture, slug: "no-picture", image: null };

test("the list paths: the search text is encoded and clipped to 100 characters, empty means none, always 25 rows", () => {
    assert.equal(toolsPath("merge pdf"), "/tools?q=merge%20pdf&per_page=25");
    assert.equal(toolsPath("  "), "/tools?per_page=25");
    assert.equal(questionsPath("100% & more"), "/questions?q=100%25%20%26%20more&per_page=25");
    assert.equal(toolsPath("x".repeat(150)), `/tools?q=${"x".repeat(100)}&per_page=25`);
});

test("the articles path carries the Blog or News filter, and All sends no type", () => {
    assert.equal(articlesPath("", "all"), "/articles?per_page=25");
    assert.equal(articlesPath("vpn", "news"), "/articles?q=vpn&type=news&per_page=25");
    assert.equal(articlesPath("", "blog"), "/articles?type=blog&per_page=25");
});

test("rows from the contract fixtures read as the commands show them", () => {
    assert.equal(toolFixture.category.title, "PDF Tools");
    // the API gives a relative path (a signed, resized /curator address): it is made absolute; https as is; nothing else is an image
    assert.equal(
        imageUrl(toolFixture.image),
        "https://fileion.com/curator/media/3f2c9d1e-aaaa-4bbb-8ccc-000000000001.jpg?w=480&h=270&fm=webp&s=abc123",
    );
    assert.equal(
        imageUrl(articleFixture.image),
        "https://fileion.com/curator/media/3f2c9d1e-aaaa-4bbb-8ccc-000000000002.jpg?w=640&h=360&fm=webp&s=def456",
    );
    assert.equal(imageUrl("https://cdn.example/x.png"), "https://cdn.example/x.png");
    assert.equal(imageUrl(articleWithoutImage.image), undefined);
    assert.equal(imageUrl("http://insecure.example/x.png"), undefined, "only https images");
    assert.equal(imageUrl("javascript:alert(1)"), undefined);
    assert.equal(
        imageUrl("//evil.example/x.png"),
        "https://fileion.com//evil.example/x.png",
        "a protocol-relative value never becomes another host",
    );
    assert.equal(imageUrl(vlc.logo), logoUrl(vlc.logo), "a title's logo and a content image follow one rule");
    assert.equal(answerLabel(questionFixture.answer_count), "3 answers");
    assert.equal(answerLabel(1), "1 answer");
    assert.equal(answerLabel(0), "No answers yet");
    assert.equal(day(questionFixture.created_at?.slice(0, 10)), "Nov 17, 2026");
    assert.equal(articleTypeLabel("news"), "News");
    assert.equal(articleTypeLabel(articleFixture.type), "Blog");
    assert.equal(day(articleFixture.published_at?.slice(0, 10)), "Nov 12, 2026");
});

test("the open and copy links are the API's Fileion page addresses, never rewritten", () => {
    for (const url of [toolFixture.url, questionFixture.url, articleFixture.url]) {
        assert.ok(/^https:\/\/([a-z0-9-]+\.)?fileion\.com\//.test(url), url);
    }
});

test("a long excerpt is cut to one line at a word", () => {
    assert.equal(oneLine("one\n two   three"), "one two three");
    assert.equal(oneLine(null), "");
    const cut = oneLine("word ".repeat(80), 40);
    assert.ok(cut.length <= 41 && cut.endsWith("…"));
});

test("the filter decides which sections are asked for", () => {
    assert.deepEqual(sectionsOf("all"), { software: true, tools: true, qa: true, articles: true });
    assert.deepEqual(sectionsOf("tools"), { software: false, tools: true, qa: false, articles: false });
    assert.deepEqual(sectionsOf("qa"), { software: false, tools: false, qa: true, articles: false });
});

test("row ids keep a tool and a title with the same slug apart", () => {
    assert.equal(rowId("tools", "pdf"), "tools:pdf");
    assert.equal(slugOfRow("software:vlc", "software"), "vlc");
    assert.equal(slugOfRow("tools:vlc", "software"), null);
    assert.equal(slugOfRow(null, "qa"), null);
});

test("a tool's icon is the site's PNG first, then its SVG, then its picture, else nothing (the hammer)", () => {
    const png = "https://fileion.com/images/email/tools/mp3-to-ogg.png";
    assert.equal(toolIconUrl({ icon_url: png, icon_svg: "<svg></svg>", image: "/curator/a.png" }), png);
    assert.match(
        toolIconUrl({ icon_url: "http://x/y.png", icon_svg: "<svg></svg>" }) ?? "",
        /^data:image\/svg/,
        "only an https icon_url counts",
    );
    assert.equal(toolIconUrl({ icon_url: null, icon_svg: null, image: null }), undefined);

    assert.match(toolIconUrl({ icon_svg: '<svg viewBox="0 0 24 24"></svg>' }) ?? "", /^data:image\/svg\+xml;base64,/);
    assert.equal(
        toolIconUrl({ icon_svg: null, image: "/curator/tools/a.png" }),
        "https://fileion.com/curator/tools/a.png",
    );
    assert.equal(toolIconUrl({ icon_svg: "<script>", image: null }), undefined);
});

const tool: ContentTool = {
    slug: "merge-pdf",
    name: "Merge PDF",
    summary: "Join PDF files [now].",
    category: { slug: "pdf", title: "PDF" },
    url: "https://tools.fileion.com/pdf/merge-pdf",
    image: "/curator/t.png",
};

test("the tool preview has its name, picture and description, escaped", () => {
    const md = toolMarkdown(tool);
    assert.match(md, /^# Merge PDF/);
    assert.match(md, /!\[\]\(https:\/\/fileion\.com\/curator\/t\.png\)/);
    assert.match(md, /Join PDF files \\\[now\\\]\./);
});

const question: ContentQuestion = {
    slug: "q",
    title: "How do I merge PDFs?",
    excerpt: "I have two files.",
    answer_count: 2,
    accepted: true,
    url: "u",
    created_at: "2026-11-01T10:00:00+00:00",
};

test("the question preview shows the excerpt and the accepted or top answer when the API sent it", () => {
    assert.match(questionMarkdown(question), /I have two files\./);
    const full = { ...question, answer: { accepted: true, author: "Sam", excerpt: "Use the Merge tool." } };
    const md = questionMarkdown(question, full);
    assert.match(md, /\*\*Accepted answer · Sam\*\*/);
    assert.match(md, /Use the Merge tool\./);
    assert.match(
        questionMarkdown(question, { ...full, answer: { accepted: false, excerpt: "Try it." } }),
        /Top answer/,
    );
    assert.match(questionMarkdown({ ...question, answer_count: 0, accepted: false }), /No answers yet/);
});

test("the article preview has the image, the excerpt and the reading time (blank on an older API)", () => {
    const a: ContentArticle = {
        slug: "a",
        title: "Best apps",
        excerpt: "Ten apps.",
        type: "blog",
        author: "Ann",
        published_at: "2026-11-02T08:00:00+00:00",
        url: "u",
        image: "/curator/a.jpg",
        reading_minutes: 4,
    };
    assert.match(articleMarkdown(a), /^!\[\]\(https:\/\/fileion\.com\/curator\/a\.jpg\)/);
    assert.equal(readingLabel(a.reading_minutes), "4 min read");
    assert.equal(readingLabel(undefined), "");
    assert.doesNotMatch(articleMarkdown({ ...a, image: null }), /!\[/);
});

test("tools can be asked newest first", () => {
    assert.equal(toolsPath("pdf", "recent"), "/tools?q=pdf&sort=recent&per_page=25");
    assert.equal(toolsPath("", "recent"), "/tools?sort=recent&per_page=25");
    assert.equal(toolsPath("pdf"), "/tools?q=pdf&per_page=25");
});

// ---- The keyless API has a per-address limit (we budget for the old 30 a minute, whatever it is now): count what a search and a selection cost ----

function counted() {
    const calls: string[] = [];
    const sw = { slug: "vlc", name: "VLC", url: "https://vlc.fileion.com", platforms: ["windows"], latest: { windows: { id: 7, version: "3", released_at: null } } } as unknown as Software;
    const deps: SearchDeps = {
        software: async () => (calls.push("software"), [sw]),
        tools: async () => (calls.push("tools"), []),
        qa: async () => (calls.push("qa"), []),
        articles: async () => (calls.push("articles"), []),
    };
    const detail = {
        getSoftware: async () => (calls.push("getSoftware"), sw),
        getVersion: async () => (calls.push("getVersion"), { id: 7, version: "3", url: "", trust: null }),
    };
    return { calls, deps, detail };
}

test("an All search costs 4 requests, and the same query again within a minute costs none", async () => {
    const { calls, deps } = counted();
    const cache = new Map();
    let t = 1000;
    await searchAllWith("how to check", "all", deps, cache, () => t);
    assert.equal(calls.length, 4);
    await searchAllWith("How To Check", "all", deps, cache, () => (t += 5000));
    assert.equal(calls.length, 4);
    await searchAllWith("how to check", "all", deps, cache, () => (t += SEARCH_TTL_MS));
    assert.equal(calls.length, 8);
    await searchAllWith("how to check", "tools", deps, new Map(), () => t);
    assert.equal(calls.length, 9);
});

test("a selection costs 1 request for the title and 1 more for its checks only on a row the person moved to", async () => {
    const { calls, detail } = counted();
    const first = await loadDetail("vlc", detail, false);
    assert.equal(calls.length, 1);
    assert.equal(first.trust, undefined);
    await loadTrust(first, detail);
    assert.equal(calls.length, 2);
});

test("the budget: five All queries a minute, each with its first row selected, stay under the 30-request budget", async () => {
    const { calls, deps, detail } = counted();
    for (let i = 0; i < 5; i++) {
        await searchAllWith(`query ${i}`, "all", deps, new Map());
        await loadDetail("vlc", detail, false);
    }
    assert.equal(calls.length, 25);
    assert.ok(calls.length < 30);
});

test("a 429 waits for Retry-After, at most a few seconds, and the busy message points at the keys page", () => {
    assert.equal(retryAfterMs("2"), 2000);
    assert.equal(retryAfterMs("60"), 4000);
    assert.equal(retryAfterMs(null), 1000);
    assert.equal(retryAfterMs("soon"), 1000);
    assert.equal(BUSY_MESSAGE, "You've reached the free limit");
    assert.equal(KEYS_URL, "https://developers.fileion.com/keys");
});
