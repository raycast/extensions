import { describe, expect, it } from "vitest";

import {
  clearReplacementSelection,
  selectAllReplacementIds,
  toggleReplacementSelection,
} from "../src/lib/selection";
import type { TextReplacement } from "../src/lib/types";

const replacements: TextReplacement[] = [
  {
    uuid: "uuid-omw",
    trigger: "omw",
    replacementText: "On my way!",
    tags: [],
    enabled: true,
  },
  {
    uuid: "uuid-brb",
    trigger: "brb",
    replacementText: "Be right back",
    tags: [],
    enabled: true,
  },
];

describe("replacement selection", () => {
  it("toggles a replacement uuid in the selected set", () => {
    expect(toggleReplacementSelection([], "uuid-omw")).toEqual(["uuid-omw"]);
    expect(toggleReplacementSelection(["uuid-omw"], "uuid-omw")).toEqual([]);
    expect(toggleReplacementSelection(["uuid-omw"], "uuid-brb")).toEqual([
      "uuid-omw",
      "uuid-brb",
    ]);
  });

  it("selects all replacement ids in list order", () => {
    expect(selectAllReplacementIds(replacements)).toEqual([
      "uuid-omw",
      "uuid-brb",
    ]);
  });

  it("clears selected replacement ids", () => {
    expect(clearReplacementSelection()).toEqual([]);
  });
});
