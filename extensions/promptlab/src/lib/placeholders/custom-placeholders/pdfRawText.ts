import { Placeholder, PlaceholderCategory, PlaceholderType } from "placeholders-toolkit";

/**
 * The raw text extracted from selected PDFs in Finder. Does not use OCR.
 */
const PDFRawTextPlaceholder: Placeholder = {
  name: "pdfRawText",
  regex: /{{pdfRawText}}/g,
  apply: async (str: string, context?: { [key: string]: unknown }) => {
    const pdfRawText = context && "pdfRawText" in context ? (context["pdfRawText"] as string) : "";
    return { result: pdfRawText, pdfRawText: pdfRawText };
  },
  result_keys: ["pdfRawText"],
  constant: true,
  fn: async () => (await PDFRawTextPlaceholder.apply("{{pdfRawText}}")).result,
  example: "Summarize this: {{pdfRawText}}",
  description: "Replaced with the raw text extracted from selected PDFs in Finder. Does not use OCR.",
  hintRepresentation: "{{pdfRawText}}",
  fullRepresentation: "PDF Text (Without OCR)",
  type: PlaceholderType.Informational,
  categories: [PlaceholderCategory.Files],
};

export default PDFRawTextPlaceholder;
