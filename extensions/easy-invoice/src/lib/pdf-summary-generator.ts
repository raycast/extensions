import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { PDF } from "./constants";
import { formatCurrency, formatDate, resolveSaveLocation } from "./formatters";
import { patchPDFKitFonts } from "./pdfkit-fix";
import { Invoice } from "./types";

patchPDFKitFonts();

export async function generatePDFSummary(
  invoices: Invoice[],
  preferences: Preferences,
  dateFrom: string,
  dateTo: string,
): Promise<string> {
  const saveBase = resolveSaveLocation(preferences.saveLocation);
  const dir = path.join(saveBase, "Exports");
  fs.mkdirSync(dir, { recursive: true });

  const today = new Date().toISOString().split("T")[0];
  const filePath = path.join(dir, `invoice-summary-${today}.pdf`);

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    let y = 50;

    // Header
    doc.font("Helvetica-Bold").fontSize(18).text(`Invoice Summary - ${preferences.businessName}`, 50, y);
    y += 26;
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(`${formatDate(dateFrom)} to ${formatDate(dateTo)}`, 50, y);
    y += 20;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#666666")
      .text(`Generated: ${formatDate(today)}`, 50, y);
    y += 20;

    // Separator
    doc
      .moveTo(50, y)
      .lineTo(PDF.WIDTH - 50, y)
      .lineWidth(1)
      .strokeColor("#CCCCCC")
      .stroke();
    y += 20;

    // Summary stats
    const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
    const totalVat = invoices.reduce((s, i) => s + i.vatAmount, 0);
    const draftCount = invoices.filter((i) => i.status === "draft").length;
    const sentCount = invoices.filter((i) => i.status === "sent").length;
    const paidCount = invoices.filter((i) => i.status === "paid").length;

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000").text("Summary", 50, y);
    y += 18;

    doc.font("Helvetica").fontSize(10);
    doc.text(`Total Invoiced: ${formatCurrency(totalInvoiced)}`, 50, y);
    y += 14;
    doc.text(`Total VAT: ${formatCurrency(totalVat)}`, 50, y);
    y += 14;
    doc.text(`Number of Invoices: ${invoices.length}`, 50, y);
    y += 14;
    doc.text(`Draft: ${draftCount} | Sent: ${sentCount} | Paid: ${paidCount}`, 50, y);
    y += 25;

    // Separator
    doc
      .moveTo(50, y)
      .lineTo(PDF.WIDTH - 50, y)
      .lineWidth(0.5)
      .strokeColor("#CCCCCC")
      .stroke();
    y += 15;

    // Table header
    const colX = {
      num: 50,
      client: 130,
      date: 260,
      subtotal: 330,
      vat: 400,
      total: 460,
      status: 520,
    };
    const colW = {
      num: 75,
      client: 125,
      date: 65,
      subtotal: 65,
      vat: 55,
      total: 55,
      status: 30,
    };

    doc.rect(50, y, PDF.WIDTH - 100, 20).fill("#F5F5F5");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000");
    doc.text("Invoice #", colX.num + 4, y + 6, { width: colW.num });
    doc.text("Client", colX.client, y + 6, { width: colW.client });
    doc.text("Date", colX.date, y + 6, { width: colW.date });
    doc.text("Subtotal", colX.subtotal, y + 6, {
      width: colW.subtotal,
      align: "right",
    });
    doc.text("VAT", colX.vat, y + 6, { width: colW.vat, align: "right" });
    doc.text("Total", colX.total, y + 6, { width: colW.total, align: "right" });
    doc.text("Status", colX.status, y + 6, { width: colW.status });
    y += 20;

    // Table rows
    doc.font("Helvetica").fontSize(8).fillColor("#000000");
    for (const inv of invoices) {
      if (y > PDF.HEIGHT - 80) {
        doc.addPage();
        y = 50;
      }

      doc.text(inv.invoiceNumber, colX.num + 4, y + 4, { width: colW.num });
      doc.text(inv.clientName, colX.client, y + 4, {
        width: colW.client,
        ellipsis: true,
      });
      doc.text(inv.invoiceDate, colX.date, y + 4, { width: colW.date });
      doc.text(formatCurrency(inv.subtotal), colX.subtotal, y + 4, {
        width: colW.subtotal,
        align: "right",
      });
      doc.text(formatCurrency(inv.vatAmount), colX.vat, y + 4, {
        width: colW.vat,
        align: "right",
      });
      doc.text(formatCurrency(inv.total), colX.total, y + 4, {
        width: colW.total,
        align: "right",
      });
      doc.text(inv.status.charAt(0).toUpperCase() + inv.status.slice(1), colX.status, y + 4, { width: colW.status });

      y += 18;
      doc
        .moveTo(50, y)
        .lineTo(PDF.WIDTH - 50, y)
        .lineWidth(0.5)
        .strokeColor("#CCCCCC")
        .stroke();
    }

    doc.end();

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}
