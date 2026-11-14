import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "child_process";
import { mkdtempSync, realpathSync, renameSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { getRecentDocuments } from "../../src/lib/pdf-expert";
import { getCurrentPageNumber } from "../../src/lib/current-page";

// Builds sanitized fixtures with the real Foundation APIs: a recent-documents
// archive (same shape as PDF Expert's .sfl4) pointing at a temp PDF, and a
// LastPosition archive like the one PDF Expert stores in the file's xattr.
const BUILD_FIXTURES = `
ObjC.import("Foundation")
function run(argv) {
  var pdfPath = argv[0], sflPath = argv[1]
  var err = Ref()
  var url = $.NSURL.fileURLWithPath(pdfPath)
  var bookmark = url.bookmarkDataWithOptionsIncludingResourceValuesForKeysRelativeToURLError(0, $(), $(), err)
  var item = $.NSDictionary.dictionaryWithObjectsForKeys(
    $([bookmark, "00000000-0000-0000-0000-000000000000", $.NSNumber.numberWithInt(0)]),
    $(["Bookmark", "uuid", "visibility"]))
  var root = $.NSDictionary.dictionaryWithObjectsForKeys($([$([item])]), $(["items"]))
  var sfl = $.NSKeyedArchiver.archivedDataWithRootObjectRequiringSecureCodingError(root, true, err)
  sfl.writeToFileAtomically(sflPath, true)
  var position = $.NSDictionary.dictionaryWithObjectsForKeys(
    $([$.NSNumber.numberWithInt(7), $.NSNumber.numberWithDouble(1.25)]),
    $(["pageNumber", "zoomFactor"]))
  var pos = $.NSKeyedArchiver.archivedDataWithRootObjectRequiringSecureCodingError(position, true, err)
  return ObjC.unwrap(pos.base64EncodedStringWithOptions(0))
}`;

describe.runIf(process.platform === "darwin")("native decoders (macOS)", () => {
  let dir: string;
  let pdfPath: string;
  let movedPdfPath: string;
  let sflPath: string;

  beforeAll(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "pdf-expert-test-")));
    pdfPath = join(dir, "example.pdf");
    sflPath = join(dir, "recent.sfl4");
    writeFileSync(pdfPath, "%PDF-1.4\n%%EOF\n");
    const positionBase64 = execFileSync("osascript", ["-l", "JavaScript", "-e", BUILD_FIXTURES, pdfPath, sflPath], {
      encoding: "utf-8",
    }).trim();
    const positionHex = Buffer.from(positionBase64, "base64").toString("hex");
    execFileSync("xattr", ["-wx", "com.readdle.LastPosition", positionHex, pdfPath]);
    // Move the file after bookmarking it: the bookmark still resolves (by file id)
    // but comes back stale, like the entries of a real recents list.
    movedPdfPath = join(dir, "moved.pdf");
    renameSync(pdfPath, movedPdfPath);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("resolves (stale) bookmarks from a recent-documents archive", () => {
    const docs = getRecentDocuments(sflPath);
    expect(docs.map((d) => d.path)).toEqual([movedPdfPath]);
    expect(docs[0].exists).toBe(true);
  });

  it("returns an empty list for an archive that is not a dictionary", () => {
    const bogus = join(dir, "bogus.sfl4");
    writeFileSync(bogus, "not an archive");
    expect(getRecentDocuments(bogus)).toEqual([]);
  });

  it("reads the 1-based page number from the LastPosition xattr", () => {
    expect(getCurrentPageNumber(movedPdfPath)).toBe(7);
  });

  it("returns null for a file without the xattr", () => {
    const other = join(dir, "other.pdf");
    writeFileSync(other, "%PDF-1.4\n%%EOF\n");
    expect(getCurrentPageNumber(other)).toBeNull();
  });
});
