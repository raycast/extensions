import { describe, expect, it } from "vitest";
import { buildImagePreviewItems } from "../image-preview-model";

describe("buildImagePreviewItems", () => {
  it("includes the image preview item with quick look metadata", () => {
    const items = buildImagePreviewItems({
      imagePath: "/tmp/diagram.svg",
      imageContent: "data:image/png;base64,abc123",
      engineLabel: "beautiful",
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("image-preview");
    expect(items[0].quickLook?.path).toBe("/tmp/diagram.svg");
    expect(items[0].title).toBe("Image");
    expect(items[0].subtitle).toBe("");
  });

  it("adds an ASCII preview item when ascii content is available", () => {
    const items = buildImagePreviewItems({
      imagePath: "/tmp/diagram.svg",
      imageContent: "data:image/png;base64,abc123",
      engineLabel: "beautiful",
      asciiContent: "+---+\n| A |\n+---+",
      beautifulMermaidSourceLabel: "bundled v1.1.3",
    });

    expect(items).toHaveLength(2);
    expect(items[1].id).toBe("ascii-preview");
    expect(items[1].title).toBe("ASCII");
    expect(items[1].subtitle).toBe("");
    expect(items[1].markdown).toContain("```text");
    expect(items[1].markdown).toContain("+---+");
    expect(items[1].markdown).toContain("beautiful-mermaid: `bundled v1.1.3`");
    expect(items[1].copyValue).toBe("+---+\n| A |\n+---+");
    expect(items[0].markdown).not.toContain("beautiful-mermaid:");
  });

  it("keeps image preview metadata focused on the actual image renderer", () => {
    const items = buildImagePreviewItems({
      imagePath: "/tmp/diagram.png",
      imageContent: "data:image/png;base64,abc123",
      engineLabel: "mmdc",
      beautifulMermaidSourceLabel: "global v1.1.3",
    });

    expect(items[0].title).toBe("Image");
    expect(items[0].subtitle).toBe("");
    expect(items[0].markdown).toContain("Renderer: `mmdc`");
    expect(items[0].markdown).not.toContain("beautiful-mermaid:");
  });
});
