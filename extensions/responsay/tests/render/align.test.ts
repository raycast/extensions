import { describe, it, expect } from "vitest";
import { alignColumns } from "../../src/render/align";

describe("alignColumns", () => {
  it("places each mark above the start of its word with gap spacing", () => {
    const { markLine, wordLine } = alignColumns(
      [
        { mark: ".", word: "if" },
        { mark: "O", word: "FINISH" },
      ],
      2,
    );
    // column widths: max(1,2)=2 ; max(1,6)=6 ; gap=2
    expect(wordLine).toBe("if  FINISH");
    expect(markLine).toBe(".   O");
  });
  it("trims trailing whitespace", () => {
    const { markLine } = alignColumns([{ mark: ".", word: "hello" }], 2);
    expect(markLine).toBe(".");
  });
  it("counts code points, not UTF-16 units, for width", () => {
    const { markLine, wordLine } = alignColumns(
      [
        { mark: "●", word: "go" },
        { mark: ".", word: "x" },
      ],
      1,
    );
    // col0 width = max(1,2) = 2 → "●" padded to 2; gap 1; then "."
    expect(wordLine).toBe("go x");
    expect(markLine).toBe("●  ."); // ● + two spaces + period
  });
});
