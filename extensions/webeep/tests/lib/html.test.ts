import { describe, expect, it } from "vitest";
import { browserPluginfileUrl, decodeEntities, htmlToMarkdown, htmlToText } from "../../src/lib/html";

describe("decodeEntities", () => {
  it("decodes named, decimal and hex entities", () => {
    expect(decodeEntities("A &amp; B &lt;c&gt; &#39;q&#39; &#x20AC; &egrave;")).toBe("A & B <c> 'q' € è");
  });

  it("leaves unknown entities alone", () => {
    expect(decodeEntities("&unknown; stays")).toBe("&unknown; stays");
  });
});

describe("htmlToMarkdown", () => {
  it("converts paragraphs, line breaks, emphasis and links", () => {
    const html =
      '<p>The course <strong>starts</strong> on <em>Monday</em>.<br />See <a href="https://example.com">the page</a>.</p><p>Bye</p>';
    expect(htmlToMarkdown(html)).toBe(
      "The course **starts** on *Monday*.\nSee [the page](https://example.com).\n\nBye",
    );
  });

  it("renders lists and headings", () => {
    expect(htmlToMarkdown("<h2>Title</h2><ul><li>one</li><li>two</li></ul>")).toBe("## Title\n\n- one\n- two");
  });

  it("drops scripts, styles and comments", () => {
    expect(htmlToMarkdown("<style>p{}</style><script>x()</script><!-- c -->text")).toBe("text");
  });

  it("collapses runs of blank lines", () => {
    expect(htmlToMarkdown("<p>a</p><p></p><p></p><p>b</p>")).toBe("a\n\nb");
  });
});

describe("htmlToText", () => {
  it("strips tags and squashes whitespace", () => {
    expect(htmlToText("<p>Hello\n   <b>world</b>&nbsp;!</p>")).toBe("Hello world !");
  });
});

describe("browserPluginfileUrl", () => {
  it("rewrites webservice pluginfile URLs and strips the token and forcedownload", () => {
    expect(
      browserPluginfileUrl(
        "https://webeep.polimi.it/webservice/pluginfile.php/1/mod_forum/post/9/notes.pdf?token=SECRET&forcedownload=1",
      ),
    ).toBe("https://webeep.polimi.it/pluginfile.php/1/mod_forum/post/9/notes.pdf");
  });

  it("leaves non-webservice URLs untouched", () => {
    expect(browserPluginfileUrl("https://example.com/page?x=1")).toBe("https://example.com/page?x=1");
  });

  it("strips the token from a relative webservice URL (base-resolved, no leak)", () => {
    const out = browserPluginfileUrl("/webservice/pluginfile.php/1/a.pdf?token=SECRET&forcedownload=1");
    expect(out).toBe("https://webeep.polimi.it/pluginfile.php/1/a.pdf");
    expect(out).not.toContain("SECRET");
    expect(out).not.toContain("token");
  });

  it("is applied to links inside markdown bodies, so tokens never leak into the detail pane", () => {
    const md = htmlToMarkdown(
      '<p>See <a href="https://webeep.polimi.it/webservice/pluginfile.php/1/a.pdf?token=SECRET">the file</a>.</p>',
    );
    expect(md).toBe("See [the file](https://webeep.polimi.it/pluginfile.php/1/a.pdf).");
    expect(md).not.toContain("SECRET");
    expect(md).not.toContain("webservice");
  });
});
