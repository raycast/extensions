import { describe, expect, it } from "vitest";
import { parseKlipyItem } from "../src/klipy";

const media_formats = {
  gif: {
    url: "https://example.com/full.gif",
    size: 1000,
    dims: [320, 240],
  },
  tinygif: {
    url: "https://example.com/tiny.gif",
    size: 200,
    dims: [120, 90],
  },
};

describe("parseKlipyItem", () => {
  it("skips blank fields and keeps distinct title and description text", () => {
    const item = parseKlipyItem({
      id: "123",
      title: "  Good Morning  ",
      content_description: "",
      description: "A cheerful animated breakfast",
      media_formats,
    });

    expect(item?.title).toBe("Good Morning");
    expect(item?.description).toBe("A cheerful animated breakfast");
    expect(item?.originalSize).toBe(1000);
  });

  it("uses tags when KLIPY omits caption fields", () => {
    const item = parseKlipyItem({
      id: "456",
      title: "",
      content_description: "",
      tags: ["reaction", "wow"],
      media_formats,
    });

    expect(item?.title).toBe("reaction");
    expect(item?.description).toBe("reaction, wow");
  });
});
