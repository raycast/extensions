import { describe, expect, it } from "vitest";
import { TarExtractor } from "../../src/icons/tar";
import { makeTar, TarFile } from "./helpers";

function extract(archive: Buffer, chunkSize = archive.length, want: (path: string) => boolean = () => true) {
  const files: Record<string, string> = {};
  const extractor = new TarExtractor(want, (path, data) => (files[path] = data.toString("utf8")));
  for (let i = 0; i < archive.length; i += chunkSize) extractor.write(archive.subarray(i, i + chunkSize));
  extractor.end();
  return files;
}

const LONG = `package/dist/esm/${"Very".repeat(30)}LongIcon.js`;

describe("TarExtractor", () => {
  const files: TarFile[] = [
    { path: "package/package.json", data: "{}" },
    { path: "package/dist/esm/Add01Icon.js", data: "x".repeat(513) },
    { path: "package/dist/esm/Empty.js", data: "" },
  ];

  it("reads every file, whatever the chunk size", () => {
    for (const size of [1, 7, 512, 100_000]) {
      expect(extract(makeTar(files), size)).toEqual({
        "package/package.json": "{}",
        "package/dist/esm/Add01Icon.js": "x".repeat(513),
        "package/dist/esm/Empty.js": "",
      });
    }
  });

  it("keeps only wanted files", () => {
    expect(Object.keys(extract(makeTar(files), 64, (path) => path.endsWith("Icon.js")))).toEqual([
      "package/dist/esm/Add01Icon.js",
    ]);
  });

  it("joins the ustar prefix onto the name", () => {
    expect(extract(makeTar([{ path: "package/dist/esm/A.js", data: "a", via: "prefix" }]))).toEqual({
      "package/dist/esm/A.js": "a",
    });
  });

  it("follows GNU long names and pax paths", () => {
    expect(extract(makeTar([{ path: LONG, data: "gnu", via: "gnu" }]))).toEqual({ [LONG]: "gnu" });
    expect(extract(makeTar([{ path: LONG, data: "pax", via: "pax" }]), 5)).toEqual({ [LONG]: "pax" });
  });

  it("rejects a cut-off archive", () => {
    const archive = makeTar(files);
    const extractor = new TarExtractor(
      () => true,
      () => undefined,
    );
    extractor.write(archive.subarray(0, 900));
    expect(() => extractor.end()).toThrow("truncated");
  });

  it("rejects a corrupt header", () => {
    const archive = makeTar(files);
    archive[10] ^= 0xff;
    expect(() => extract(archive)).toThrow("checksum");
  });
});
