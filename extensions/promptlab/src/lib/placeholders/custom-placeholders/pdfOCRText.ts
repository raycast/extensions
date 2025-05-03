import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * The text extracted from selected PDFs in Finder using OCR.
 */
const PDFOCRTextPlaceholder: Placeholder = {
  name: "pdfOCRText",
  regex: /{{pdfOCRText}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const pdfOCRText = context && "pdfOCRText" in context ? (context["pdfOCRText"] as string) : "";
    return { result: pdfOCRText, pdfOCRText: pdfOCRText };
  },
  result_keys: ["pdfOCRText"],
  constant: true,
  fn: async () => (await PDFOCRTextPlaceholder.apply("{{pdfOCRText}}")).result,
  example: "Summarize this: {{pdfOCRText}}",
  description: "Replaced with the text extracted from selected PDFs in Finder using OCR.",
  hintRepresentation: "{{pdfOCRText}}",
  fullRepresentation: "PDF Text (With OCR)",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default PDFOCRTextPlaceholder;
