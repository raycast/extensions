import { describe, expect, it } from "vitest";
import {
  loadReleaseNotes,
  loadReleaseNoteArticle,
  nextReleaseVersion,
  parseReleaseNotesToc,
  releaseNoteCategories,
  releaseNoteHtmlToMarkdown,
  releaseTitleForVersion,
} from "../release-notes";

describe("Salesforce release notes", () => {
  it("maps Salesforce release versions to seasonal names", () => {
    expect(releaseTitleForVersion("252.0.0")).toBe("Winter ’25");
    expect(releaseTitleForVersion("260.0.0")).toBe("Spring ’26");
    expect(releaseTitleForVersion("262.0.0")).toBe("Summer ’26");
    expect(releaseTitleForVersion("264.0.0")).toBe("Winter ’27");
    expect(nextReleaseVersion("262.0.0")).toBe("264.0.0");
  });

  it("parses leaf notes, hierarchy, flags, links, and HTML entities", () => {
    const html = `
      <li id="root" role="treeitem" aria-level="1">
        <button class="slds-button"></button>
        <a href="/apex/HTViewHelpDoc?id=release-notes.salesforce_release_notes.htm">Summer ’26</a>
      </li>
      <li id="development" role="treeitem" aria-level="2">
        <button class="slds-button"></button>
        <a href="/apex/HTViewHelpDoc?id=release-notes.rn_development.htm">Development</a>
      </li>
      <li id="apex" role="treeitem" aria-level="3">
        <button class="slds-button"></button>
        <a href="/apex/HTViewHelpDoc?id=release-notes.rn_apex.htm">Apex</a>
      </li>
      <li id="leaf" role="treeitem" aria-level="4">
        <button class="slds-button slds-is-disabled" disabled="disabled"></button>
        <a href="/apex/HTViewHelpDoc?id=release-notes.rn_apex_amp_ru_262.htm">Secure Apex &amp; APIs (Release Update)</a>
      </li>
      <li id="retirement" role="treeitem" aria-level="4">
        <button class="slds-button slds-is-disabled" disabled="disabled"></button>
        <a href="/apex/HTViewHelpDoc?id=release-notes.rn_api_retirement.htm">SOAP API Is Being Retired</a>
      </li>`;

    const notes = parseReleaseNotesToc(html, "Summer ’26", "262.0.0");
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({
      id: "release-notes.rn_apex_amp_ru_262.htm",
      title: "Secure Apex & APIs (Release Update)",
      category: "Development",
      section: "Apex",
      isReleaseUpdate: true,
      isRetirement: false,
    });
    expect(notes[0].url).toContain("help.salesforce.com/s/articleView");
    expect(notes[0].url).toContain("release=262");
    expect(notes[1].isRetirement).toBe(true);
    expect(releaseNoteCategories(notes)).toEqual(["Development"]);
  });

  it("deduplicates repeated TOC entries by topic ID", () => {
    const leaf = `<li role="treeitem" aria-level="2"><button disabled="disabled"></button><a href="/apex/HTViewHelpDoc?id=release-notes.rn_one.htm">One</a></li>`;
    expect(parseReleaseNotesToc(`${leaf}${leaf}`, "Summer ’26", "262.0.0")).toHaveLength(1);
  });

  it("converts release-note HTML into scrollable Raycast Markdown", () => {
    const markdown = releaseNoteHtmlToMarkdown(`
      <html><head><style>.hidden { display: none }</style></head><body>
        <h1>OAuth Changes</h1>
        <p>Review the <strong>required</strong> changes &amp; timing.</p>
        <ul><li>Update your app</li><li><a href="/s/articleView?id=sf.example.htm">Read setup</a></li></ul>
      </body></html>`);
    expect(markdown).toContain("# OAuth Changes");
    expect(markdown).toContain("**required**");
    expect(markdown).toContain("- Update your app");
    expect(markdown).toContain("[Read setup](https://help.salesforce.com/s/articleView?id=sf.example.htm)");
    expect(markdown).not.toContain("display: none");
  });

  it.runIf(process.env.RUN_LIVE_RELEASE_NOTES === "1")(
    "loads the live official Salesforce release-note index",
    async () => {
      const loaded = await loadReleaseNotes(true);
      expect(loaded.source).toBe("live");
      expect(loaded.feed.releaseVersion).toMatch(/^\d+\.0\.0$/);
      expect(loaded.feed.notes.length).toBeGreaterThan(100);
      expect(loaded.feed.notes.every((note) => note.url.startsWith("https://help.salesforce.com/"))).toBe(true);
      const article = await loadReleaseNoteArticle(loaded.feed.notes[0], true);
      expect(article.markdown.length).toBeGreaterThan(200);
      expect(article.markdown).toContain(loaded.feed.notes[0].releaseTitle);
    },
    60_000,
  );
});
