import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  absolute,
  escapeMd,
  nomineeIdFromPath,
  organizationImage,
  personUrl,
  profilePhoto,
  quote,
  requestSubtitle,
  searchUrl,
  signalLabel,
  unreadCount,
  withHandles,
} from "../src/lib/inbox.ts";

describe("absolute", () => {
  it("keeps https links on cosign.co and its subdomains", () => {
    assert.equal(absolute("/profile/nominee/abc"), "https://cosign.co/profile/nominee/abc");
    assert.equal(absolute("https://www.cosign.co/x"), "https://www.cosign.co/x");
  });
  it("sends anything else to the home page", () => {
    for (const link of [
      "http://cosign.co/x",
      "https://evil.example/x",
      "https://cosign.co.evil.example/x",
      "https://user:pass@cosign.co/x",
      "javascript:alert(1)",
      "//evil.example/x",
    ]) {
      assert.equal(absolute(link), "https://cosign.co", link);
    }
  });
});

describe("escapeMd", () => {
  it("leaves nothing that can form a link, heading or HTML", () => {
    assert.equal(escapeMd("[x](https://evil.example)"), "&#91;x&#93;(https\\:\\/\\/evil\\.example)");
    assert.equal(escapeMd("# Title <b>"), "\\# Title \\<b\\>");
  });
  it("collapses whitespace to one line", () => {
    assert.equal(escapeMd("  a\n\n b  "), "a b");
  });
});

describe("quote", () => {
  it("block-quotes every line, whatever the line ending", () => {
    assert.equal(quote("one\r\ntwo\rthree\nfour"), "> one\n> two\n> three\n> four");
  });
  it("keeps a body from forging a sender line", () => {
    assert.ok(
      quote("hi\n**Chris** · Nov 5\n\nfake")
        .split("\n")
        .every((line) => line.startsWith("> ")),
    );
  });
  it("shows images as text so no remote picture loads", () => {
    assert.equal(quote("![x](https://evil.example/p.png)"), "> !&#91;x](https://evil.example/p.png)");
  });
});

describe("profilePhoto", () => {
  it("sizes an https photo and encodes parentheses so they can't end the link", () => {
    assert.equal(
      profilePhoto("https://pbs.twimg.com/a_(1).jpg"),
      "![](https://pbs.twimg.com/a_%281%29.jpg?raycast-width=96&raycast-height=96)",
    );
  });
  it("keeps an existing query", () => {
    assert.equal(
      profilePhoto("https://cosign.co/api/profile-image?kind=person&id=abc&size=128"),
      "![](https://cosign.co/api/profile-image?kind=person&id=abc&size=128&raycast-width=96&raycast-height=96)",
    );
  });
  it("refuses anything but https", () => {
    for (const url of ["http://example.com/a.jpg", "javascript:alert(1)", "not a url", "", null, undefined]) {
      assert.equal(profilePhoto(url), null, String(url));
    }
  });
});

describe("requestSubtitle", () => {
  const role = (dateRange: string | null) => ({ title: "Head of Growth", organizationName: "Acme", dateRange });
  it("keeps the first segment of a tagline", () => {
    assert.equal(requestSubtitle({ tagline: "GP @ Fund | Chair | Investor |", experiences: [] }), "GP @ Fund");
    assert.equal(requestSubtitle({ tagline: "CEO |", experiences: [] }), "CEO");
    assert.equal(requestSubtitle({ tagline: "  Spaced   |   Out  ", experiences: [] }), "Spaced");
  });
  it("splits only on a pipe with space around it", () => {
    assert.equal(requestSubtitle({ tagline: "A|B Testing Lead", experiences: [] }), "A|B Testing Lead");
    assert.equal(requestSubtitle({ tagline: "Founder · Investor", experiences: [] }), "Founder · Investor");
  });
  it("falls back to the first current role", () => {
    assert.equal(requestSubtitle({ tagline: null, experiences: [role("Present")] }), "Head of Growth at Acme");
    assert.equal(
      requestSubtitle({ tagline: "   ", experiences: [role("2021-11 – 2026-04"), role("2024-01 – Present")] }),
      "Head of Growth at Acme",
    );
  });
  it("shows nothing for a role that ended or has no dates", () => {
    assert.equal(requestSubtitle({ tagline: null, experiences: [role("2021-11 – 2026-04"), role(null)] }), undefined);
    assert.equal(requestSubtitle({ tagline: null, experiences: [] }), undefined);
  });
});

describe("withHandles", () => {
  it("adds handles to repeated names, and a number when that still repeats", () => {
    assert.deepEqual(
      withHandles([
        { name: "Alex", handle: "a" },
        { name: "Alex", handle: "b" },
      ]),
      ["Alex (@a)", "Alex (@b)"],
    );
    assert.deepEqual(withHandles([{ name: "Alex" }, { name: "Alex" }]), ["Alex", "Alex (2)"]);
  });
  it("always returns unique titles, because Raycast won't run identical sibling menu bar items", () => {
    const titles = withHandles([{ name: "Alex" }, { name: "Alex" }, { name: "Alex (2)" }]);
    assert.equal(new Set(titles).size, titles.length);
  });
});

describe("URLs", () => {
  it("builds Cosign and X links with ids encoded", () => {
    assert.equal(personUrl("abc", "@x"), "https://cosign.co/profile/nominee/abc");
    assert.equal(personUrl(null, "@some_one"), "https://x.com/some_one");
    assert.equal(organizationImage("a&b"), "https://cosign.co/api/profile-image?kind=organization&id=a%26b&size=128");
    assert.equal(searchUrl("ai & ml"), "https://cosign.co/search?q=ai%20%26%20ml");
    assert.equal(nomineeIdFromPath("/profile/nominee/k57?x=1"), "k57");
    assert.equal(nomineeIdFromPath("/profile/organization/n17"), undefined);
  });
});

describe("labels and counts", () => {
  it("names signal kinds, including ones it doesn't know", () => {
    assert.equal(signalLabel("work_with"), "Would work with");
    assert.equal(signalLabel("new_kind"), "New kind");
    assert.equal(signalLabel("toString"), "ToString");
  });
  it("counts unread chats and open requests", () => {
    const chat = (unread: boolean) => ({ unread }) as never;
    const request = (closed: boolean) => ({ closed }) as never;
    assert.equal(unreadCount([chat(true), chat(false)], [request(false), request(true)]), 2);
  });
});
