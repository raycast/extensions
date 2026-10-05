import { describe, expect, it } from "vitest";
import { resolveMlang } from "../../src/lib/mlang";

describe("resolveMlang", () => {
  const bilingual = "{mlang it}archivio registrazione{mlang}{mlang en}recording archive{mlang}";

  it("returns the text untouched when it has no tags", () => {
    expect(resolveMlang("Plain title", "en")).toBe("Plain title");
  });

  it("picks the requested language", () => {
    expect(resolveMlang(bilingual, "it")).toBe("archivio registrazione");
    expect(resolveMlang(bilingual, "en")).toBe("recording archive");
  });

  it("falls back to English, then Italian, then the first variant", () => {
    expect(resolveMlang("{mlang it}solo italiano{mlang}", "en")).toBe("solo italiano");
    expect(resolveMlang("{mlang en}only english{mlang}", "it")).toBe("only english");
    expect(resolveMlang("{mlang de}nur deutsch{mlang}{mlang fr}français{mlang}", "en")).toBe("nur deutsch");
  });

  it("keeps text outside the tags", () => {
    expect(resolveMlang("089182 - {mlang it}Compilatori{mlang}{mlang en}Compilers{mlang} [2026-27]", "en")).toBe(
      "089182 - Compilers [2026-27]",
    );
  });

  it("is case-insensitive on the tag and handles newlines inside", () => {
    expect(resolveMlang("{MLANG EN}line one\nline two{MLANG}", "en")).toBe("line one\nline two");
  });
});
