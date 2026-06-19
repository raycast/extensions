import { mkdtemp, rm, utimes, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { scanDirectories } from "../file-scanner";

describe("scanDirectories", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "calibre-search-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("asynchronously returns ebook files sorted by newest modification time", async () => {
    const older = join(dir, "older.epub");
    const newer = join(dir, "newer.pdf");
    await writeFile(older, "older");
    await writeFile(newer, "newer");
    await writeFile(join(dir, "notes.txt"), "ignored");
    await utimes(older, new Date("2024-01-01"), new Date("2024-01-01"));
    await utimes(newer, new Date("2024-01-02"), new Date("2024-01-02"));

    await expect(scanDirectories([dir])).resolves.toMatchObject([
      { path: newer, name: "newer.pdf" },
      { path: older, name: "older.epub" },
    ]);
  });

  it("deduplicates repeated directories and ignores missing ones", async () => {
    const book = join(dir, "book.mobi");
    await writeFile(book, "book");

    const ebooks = await scanDirectories([dir, dir, join(dir, "missing")]);

    expect(ebooks.map((ebook) => ebook.path)).toEqual([book]);
  });
});
