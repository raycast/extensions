import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { PDF } from "./constants";
import { formatCurrency, formatDate, parseAddress, resolveSaveLocation } from "./formatters";
import { patchPDFKitFonts } from "./pdfkit-fix";
import { Invoice } from "./types";

// Ensure font files are available before any PDF generation
patchPDFKitFonts();

const LIGHT_GREY = "#E5E5E5";
const MID_GREY = "#999999";
const BLACK = "#000000";

const M = PDF.MARGIN;
const CW = PDF.CONTENT_WIDTH;
const TABLE_RIGHT = PDF.WIDTH - M;

// Table column layout
const COL_AMOUNT_W = 70;
const COL_RATE_W = 70;
const COL_QTY_W = 40;
const COL_AMOUNT_X = TABLE_RIGHT - COL_AMOUNT_W;
const COL_RATE_X = COL_AMOUNT_X - COL_RATE_W;
const COL_QTY_X = COL_RATE_X - COL_QTY_W;
const COL_DESC_X = M;
const COL_DESC_W = COL_QTY_X - COL_DESC_X - 8;

export async function generateInvoicePDF(invoice: Invoice, preferences: Preferences): Promise<string> {
  const saveBase = resolveSaveLocation(preferences.saveLocation);
  const year = new Date(invoice.invoiceDate).getFullYear().toString();
  const dir = path.join(saveBase, year);
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${invoice.invoiceNumber}.pdf`);

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: M, bottom: M, left: M, right: M },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    let y: number = M;

    // Invoice title + number (top right)
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK);
    doc.text("INVOICE", M, y, { width: CW, align: "right" });
    y += 14;
    doc.font("Helvetica").fontSize(9).fillColor(MID_GREY);
    doc.text(invoice.invoiceNumber, M, y, { width: CW, align: "right" });

    // Business name (top left, same baseline as INVOICE)
    doc.font("Helvetica-Bold").fontSize(9).fillColor(BLACK).text(preferences.businessName, M, M);

    y += 24;

    // Divider
    doc.moveTo(M, y).lineTo(TABLE_RIGHT, y).lineWidth(0.5).strokeColor(LIGHT_GREY).stroke();
    y += 20;

    // Two-column: From / To
    const colLeft = M;
    const colRight = M + CW / 2 + 20;

    // From label
    doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text("From", colLeft, y);
    y += 12;
    const fromStartY = y;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(BLACK).text(preferences.yourName, colLeft, y);
    y += 12;
    doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
    for (const line of parseAddress(preferences.businessAddress)) {
      doc.text(line, colLeft, y);
      y += 12;
    }
    if (preferences.businessEmail) {
      doc.text(preferences.businessEmail, colLeft, y);
      y += 12;
    }
    if (preferences.businessPhone) {
      doc.text(preferences.businessPhone, colLeft, y);
      y += 12;
    }

    // To (right column, same start Y)
    let ry = fromStartY - 12;
    doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text("To", colRight, ry);
    ry += 12;
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(BLACK).text(invoice.clientName, colRight, ry);
    ry += 12;
    if (invoice.clientAddress) {
      doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
      const lines =
        invoice.clientAddress.split("\n").length > 1
          ? invoice.clientAddress.split("\n")
          : parseAddress(invoice.clientAddress);
      for (const line of lines) {
        doc.text(line, colRight, ry);
        ry += 12;
      }
    }
    doc.font("Helvetica").fontSize(8.5).fillColor(BLACK).text(invoice.clientEmail, colRight, ry);
    ry += 12;

    y = Math.max(y, ry) + 8;

    // Date / Due row
    doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text("Date", colLeft, y);
    doc.text("Due", colRight, y);
    y += 12;
    doc.font("Helvetica").fontSize(8.5).fillColor(BLACK).text(formatDate(invoice.invoiceDate), colLeft, y);
    doc.text(formatDate(invoice.dueDate), colRight, y);
    y += 20;

    // Divider
    doc.moveTo(M, y).lineTo(TABLE_RIGHT, y).lineWidth(0.5).strokeColor(LIGHT_GREY).stroke();
    y += 16;

    // Line items table header
    doc.font("Helvetica").fontSize(7).fillColor(MID_GREY);
    doc.text("Description", COL_DESC_X, y, { width: COL_DESC_W });
    doc.text("Qty", COL_QTY_X, y, { width: COL_QTY_W, align: "right" });
    doc.text("Rate", COL_RATE_X, y, { width: COL_RATE_W, align: "right" });
    doc.text("Amount", COL_AMOUNT_X, y, {
      width: COL_AMOUNT_W,
      align: "right",
    });
    y += 14;
    doc.moveTo(M, y).lineTo(TABLE_RIGHT, y).lineWidth(0.5).strokeColor(LIGHT_GREY).stroke();
    y += 2;

    // Table rows
    doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
    for (const item of invoice.lineItems) {
      const descH = doc.heightOfString(item.description, { width: COL_DESC_W });
      const rowH = Math.max(descH + 10, 20);

      // Page break check
      if (y + rowH > PDF.HEIGHT - M - 80) {
        doc.addPage();
        y = M;
      }

      const ty = y + 5;
      doc.text(item.description, COL_DESC_X, ty, { width: COL_DESC_W });
      const qtyStr = Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toFixed(2);
      doc.text(qtyStr, COL_QTY_X, ty, { width: COL_QTY_W, align: "right" });
      doc.text(formatCurrency(item.rate), COL_RATE_X, ty, {
        width: COL_RATE_W,
        align: "right",
      });
      doc.text(formatCurrency(item.lineTotal), COL_AMOUNT_X, ty, {
        width: COL_AMOUNT_W,
        align: "right",
      });
      y += rowH;
      doc.moveTo(M, y).lineTo(TABLE_RIGHT, y).lineWidth(0.5).strokeColor(LIGHT_GREY).stroke();
      y += 2;
    }

    // Totals
    y += 10;
    doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
    doc.text("Subtotal", COL_RATE_X, y, { width: COL_RATE_W, align: "right" });
    doc.text(formatCurrency(invoice.subtotal), COL_AMOUNT_X, y, {
      width: COL_AMOUNT_W,
      align: "right",
    });
    y += 14;

    if (invoice.vatApplied) {
      doc.text(`VAT (${invoice.vatRate}%)`, COL_RATE_X, y, {
        width: COL_RATE_W,
        align: "right",
      });
      doc.text(formatCurrency(invoice.vatAmount), COL_AMOUNT_X, y, {
        width: COL_AMOUNT_W,
        align: "right",
      });
      y += 14;
    }

    y += 2;
    doc.moveTo(COL_RATE_X, y).lineTo(TABLE_RIGHT, y).lineWidth(0.5).strokeColor(LIGHT_GREY).stroke();
    y += 8;
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Total", COL_RATE_X, y, { width: COL_RATE_W, align: "right" });
    doc.text(formatCurrency(invoice.total), COL_AMOUNT_X, y, {
      width: COL_AMOUNT_W,
      align: "right",
    });
    y += 18;

    if (invoice.vatApplied && preferences.vatNumber) {
      doc.font("Helvetica").fontSize(7).fillColor(MID_GREY);
      doc.text(`VAT Registration: ${preferences.vatNumber}`, COL_RATE_X, y, {
        width: TABLE_RIGHT - COL_RATE_X,
        align: "right",
      });
      y += 14;
    }

    // Payment details
    y += 24;
    y = checkPageBreak(doc, y, 60);
    doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text("Payment Details", M, y);
    y += 12;
    doc.font("Helvetica").fontSize(8.5).fillColor(BLACK);
    doc.text(
      `${preferences.bankName}  ·  ${preferences.accountName}  ·  ${preferences.sortCode}  ·  ${preferences.accountNumber}`,
      M,
      y,
      { width: CW },
    );
    y += 14;
    const terms =
      preferences.paymentTermsText || `Payment due within ${preferences.paymentTermsDays} days of invoice date`;
    doc.font("Helvetica").fontSize(8).fillColor(MID_GREY).text(terms, M, y, { width: CW });
    y += 12;

    // Notes
    if (invoice.notes) {
      y += 14;
      y = checkPageBreak(doc, y, 40);
      doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text("Notes", M, y);
      y += 12;
      doc.font("Helvetica").fontSize(8.5).fillColor(BLACK).text(invoice.notes, M, y, { width: CW });
    }

    // Footer
    const footerY = PDF.HEIGHT - M - 10;
    doc.font("Helvetica").fontSize(7).fillColor(MID_GREY).text(preferences.businessName, M, footerY, {
      width: CW,
      align: "center",
    });

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

function checkPageBreak(doc: PDFKit.PDFDocument, y: number, requiredSpace: number): number {
  if (y + requiredSpace > PDF.HEIGHT - M - 20) {
    doc.addPage();
    return M;
  }
  return y;
}
