import { afterEach, describe, expect, it } from "vitest";
import { MAX_RECEIPT_BYTES, guessDate, guessVendor, isReceiptFile, receiptFileProblem } from "../src/lib/receipt";
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

  it("reports a file that vanished after it was chosen instead of throwing", () => {
    const vanished = () => {
      throw Object.assign(new Error("ENOENT: no such file or directory"), { code: "ENOENT" });
    };
    expect(receiptFileProblem("/tmp/moved.pdf", vanished)).toBe("receipt.validation.unreadable");
    expect(receiptFileProblem("/tmp/ok.pdf", () => 1024)).toBeUndefined();
    expect(receiptFileProblem("/tmp/big.pdf", () => MAX_RECEIPT_BYTES + 1)).toBe("receipt.validation.size");
    expect(receiptFileProblem("/tmp/a.docx", () => 1)).toBe("receipt.validation.type");
    expect(receiptFileProblem(undefined)).toBe("receipt.validation.file");
    expect(receiptFileProblem("/definitely/not/here.pdf")).toBe("receipt.validation.unreadable");
  });

  it("takes PDFs and images only", () => {
    expect(isReceiptFile("a.PDF")).toBe(true);
    expect(isReceiptFile("a.heic")).toBe(true);
    expect(isReceiptFile("a.docx")).toBe(false);
  });
});
