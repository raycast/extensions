import { afterEach, describe, expect, it } from "vitest";
import { guessDate, guessVendor, isReceiptFile } from "../src/lib/receipt";
import { harness, toolCalls, type Harness } from "./helpers";

let current: Harness | undefined;
afterEach(() => current?.client.close());

describe("Capture Receipt", () => {
  it("creates an inbox expense and stores the file with it", async () => {
    const h = (current = harness("receipt-ok.json"));
    const expense = await h.api.captureReceipt(
      { vendor: "Papeterie Nord", gross_amount: "35.70", date: "2026-10-07" },
      { name: "beleg.pdf", bytes: Buffer.from("%PDF-1.7") },
    );
    expect(expense.has_receipt).toBe(true);
    expect(toolCalls(h, "expenses_create")[0].params?.arguments).toEqual({
      vendor: "Papeterie Nord",
      gross_amount: "35.70",
      date: "2026-10-07",
      status: "inbox",
    });
    expect(toolCalls(h, "expenses_add_receipt_file")[0].params?.arguments).toEqual({
      expense_id: "E-NEW",
      file_name: "beleg.pdf",
      content_base64: Buffer.from("%PDF-1.7").toString("base64"),
    });
  });

  it("removes the new inbox expense again when the file is a duplicate", async () => {
    const h = (current = harness("receipt-duplicate.json"));
    const error = await h.api
      .captureReceipt({ vendor: "Papeterie Nord", gross_amount: "35.70" }, { name: "beleg.pdf", bytes: Buffer.from("x") })
      .catch((failure) => failure);
    expect(error.kind).toBe("duplicateReceipt");
    expect(toolCalls(h, "expenses_delete")[0].params?.arguments).toEqual({ id: "E-NEW" });
  });

  it("guesses vendor and date from the file name", () => {
    expect(guessVendor("/Users/demo/Downloads/2026-10-02_Wolkenhost_Rechnung_R123.pdf")).toBe("Wolkenhost");
    expect(guessVendor("Scan 12.jpg")).toBe("");
    expect(guessDate("2026-10-02_Wolkenhost.pdf")?.getDate()).toBe(2);
    expect(guessDate("Beleg 07.10.2026.pdf")?.getMonth()).toBe(9);
    expect(guessDate("beleg.pdf")).toBeUndefined();
  });

  it("takes PDFs and images only", () => {
    expect(isReceiptFile("a.PDF")).toBe(true);
    expect(isReceiptFile("a.heic")).toBe(true);
    expect(isReceiptFile("a.docx")).toBe(false);
  });
});
