import { describe, expect, it } from "vitest";
import { contactUrl, documentPdfUrl, documentUrl, thirdpartyUrl } from "./urls";

const web = "https://dolibarr.example.org";

describe("deep links", () => {
  it("points at the company card", () => {
    expect(thirdpartyUrl(web, 323)).toBe("https://dolibarr.example.org/societe/card.php?id=323");
  });

  it("points at the contact card", () => {
    expect(contactUrl(web, 2)).toBe("https://dolibarr.example.org/contact/card.php?id=2");
  });

  it("points proposals and invoices at their respective paths", () => {
    expect(documentUrl(web, "proposal", 94)).toBe("https://dolibarr.example.org/comm/propal/card.php?id=94");
    expect(documentUrl(web, "invoice", 5)).toBe("https://dolibarr.example.org/compta/facture/card.php?id=5");
  });

  it("builds the PDF address from the document reference", () => {
    expect(documentPdfUrl(web, "proposal", "A202608-0092")).toBe(
      "https://dolibarr.example.org/document.php?modulepart=propal&attachment=0&file=A202608-0092%2FA202608-0092.pdf&entity=1",
    );
  });

  it("serves the PDF inline instead of as a download", () => {
    // attachment=0 opens the file in the browser, attachment=1 downloads it.
    expect(documentPdfUrl(web, "invoice", "R202608-0179")).toContain("attachment=0");
  });

  it("points orders at the commande card", () => {
    expect(documentUrl(web, "order", 23)).toBe("https://dolibarr.example.org/commande/card.php?id=23");
  });

  it("uses the commande module part for order PDFs", () => {
    expect(documentPdfUrl(web, "order", "AB202608-0020")).toContain("modulepart=commande");
  });

  it("rejects invalid IDs", () => {
    expect(() => thirdpartyUrl(web, 1.5)).toThrow(/ID/);
    expect(() => thirdpartyUrl(web, Number.NaN)).toThrow(/ID/);
  });
});
