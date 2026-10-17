import { describe, expect, it } from "vitest";

import { truncate } from "./text";

describe("truncate", () => {
  it("keeps short text and cuts long text on code points with an ellipsis", () => {
    expect(truncate("Truyện Kiều", 20)).toBe("Truyện Kiều");
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("ab  cdef", 4)).toBe("ab…");
    expect(truncate("字字字字字", 3)).toBe("字字…");
  });
});
