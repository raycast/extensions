import { describe, expect, it } from "vitest";
import { decodeEntities, htmlToMarkdown, htmlToText } from "../../src/lib/html";

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
