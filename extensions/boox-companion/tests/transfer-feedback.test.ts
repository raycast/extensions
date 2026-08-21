import { describe, expect, it } from "vitest";
import { describeTransferSuccess } from "../src/lib/transfer-feedback";

describe("describeTransferSuccess", () => {
  it("describes a storage transfer with skipped files", () => {
    expect(describeTransferSuccess({ items: [], uploaded: 2, skipped: 1, failed: 0 }, "Note Air4 C", "storage")).toBe(
      "Sent 2 files to Note Air4 C · 1 skipped"
    );
  });

  it("describes a library upload awaiting indexing", () => {
    expect(
      describeTransferSuccess(
        {
          items: [{ path: "/tmp/book.epub", name: "book.epub", status: "uploaded", indexed: false }],
          uploaded: 1,
          skipped: 0,
          failed: 0,
        },
        "Note Air4 C",
        "library"
      )
    ).toBe("Added 1 document to Note Air4 C Library · 1 awaiting Library indexing");
  });

  it("does not claim that skipped files were sent", () => {
    expect(describeTransferSuccess({ items: [], uploaded: 0, skipped: 3, failed: 0 }, "Note Air4 C", "storage")).toBe(
      "No files sent to Note Air4 C · 3 skipped"
    );
  });
});
