export enum Section {
  Compress = "Compress",
  Convert = "Convert",
  AIPDF = "AI PDF",
  Organize = "Organize",
  ViewAndEdit = "View & Edit",
  ConvertFromPDF = "Convert from PDF",
  ConvertToPDF = "Convert to PDF",
  Sign = "Sign",
  More = "More",
  Scan = "Scan",
}

export type Tool = {
  name: string;
  icon: string; // Path to SVG icon
  section: Section;
  url: string;
};

export const tools: Tool[] = [
  // Compress
  {
    name: "Compress PDF",
    icon: "icons/compress.png",
    section: Section.Compress,
    url: "https://smallpdf.com/compress-pdf",
  },

  // Convert
  {
    name: "PDF Converter",
    icon: "icons/converter.png",
    section: Section.Convert,
    url: "https://smallpdf.com/pdf-converter",
  },

  // AI PDF
  { name: "Chat with PDF", icon: "icons/ai-chat.png", section: Section.AIPDF, url: "https://smallpdf.com/chat-pdf" },
  {
    name: "AI PDF Summarizer",
    icon: "icons/ai-summarize.png",
    section: Section.AIPDF,
    url: "https://smallpdf.com/pdf-summarizer",
  },
  {
    name: "Translate PDF",
    icon: "icons/ai-translate.png",
    section: Section.AIPDF,
    url: "https://smallpdf.com/translate-pdf",
  },
  {
    name: "AI Question Generator",
    icon: "icons/ai-question.png",
    section: Section.AIPDF,
    url: "https://smallpdf.com/question-generator",
  },

  // Organize
  { name: "Merge PDF", icon: "icons/merge.png", section: Section.Organize, url: "https://smallpdf.com/merge-pdf" },
  { name: "Split PDF", icon: "icons/split.png", section: Section.Organize, url: "https://smallpdf.com/split-pdf" },
  { name: "Rotate PDF", icon: "icons/rotate.png", section: Section.Organize, url: "https://smallpdf.com/rotate-pdf" },
  {
    name: "Delete PDF Pages",
    icon: "icons/delete.png",
    section: Section.Organize,
    url: "https://smallpdf.com/delete-pages-from-pdf",
  },
  {
    name: "Extract PDF Pages",
    icon: "icons/extract.png",
    section: Section.Organize,
    url: "https://smallpdf.com/extract-pdf-pages",
  },
  {
    name: "Organize PDF",
    icon: "icons/organize.png",
    section: Section.Organize,
    url: "https://smallpdf.com/organize-pdf",
  },

  // View & Edit
  { name: "Edit PDF", icon: "icons/edit.png", section: Section.ViewAndEdit, url: "https://smallpdf.com/edit-pdf" },
  {
    name: "PDF Annotator",
    icon: "icons/annotate.png",
    section: Section.ViewAndEdit,
    url: "https://smallpdf.com/pdf-annotator",
  },
  {
    name: "PDF Reader",
    icon: "icons/reader.png",
    section: Section.ViewAndEdit,
    url: "https://smallpdf.com/pdf-reader",
  },
  {
    name: "Number Pages",
    icon: "icons/number.png",
    section: Section.ViewAndEdit,
    url: "https://smallpdf.com/add-page-numbers-to-pdf",
  },
  { name: "Crop PDF", icon: "icons/crop.png", section: Section.ViewAndEdit, url: "https://smallpdf.com/crop-pdf" },
  {
    name: "Redact PDF",
    icon: "icons/redact.png",
    section: Section.ViewAndEdit,
    url: "https://smallpdf.com/redact-pdf",
  },
  {
    name: "Watermark PDF",
    icon: "icons/watermark.png",
    section: Section.ViewAndEdit,
    url: "https://smallpdf.com/watermark-pdf",
  },
  {
    name: "Share PDF",
    icon: "icons/share.png",
    section: Section.ViewAndEdit,
    url: "https://smallpdf.com/share-document",
  },

  // Convert from PDF
  {
    name: "PDF to Word",
    icon: "icons/pdf-word.png",
    section: Section.ConvertFromPDF,
    url: "https://smallpdf.com/pdf-to-word",
  },
  {
    name: "PDF to Excel",
    icon: "icons/pdf-excel.png",
    section: Section.ConvertFromPDF,
    url: "https://smallpdf.com/pdf-to-excel",
  },
  {
    name: "PDF to PPT",
    icon: "icons/pdf-ppt.png",
    section: Section.ConvertFromPDF,
    url: "https://smallpdf.com/pdf-to-ppt",
  },
  {
    name: "PDF to JPG",
    icon: "icons/pdf-image.png",
    section: Section.ConvertFromPDF,
    url: "https://smallpdf.com/pdf-to-jpg",
  },

  // Convert to PDF
  {
    name: "Word to PDF",
    icon: "icons/pdf-word.png",
    section: Section.ConvertToPDF,
    url: "https://smallpdf.com/word-to-pdf",
  },
  {
    name: "Excel to PDF",
    icon: "icons/pdf-excel.png",
    section: Section.ConvertToPDF,
    url: "https://smallpdf.com/excel-to-pdf",
  },
  {
    name: "PPT to PDF",
    icon: "icons/pdf-ppt.png",
    section: Section.ConvertToPDF,
    url: "https://smallpdf.com/ppt-to-pdf",
  },
  {
    name: "JPG to PDF",
    icon: "icons/pdf-image.png",
    section: Section.ConvertToPDF,
    url: "https://smallpdf.com/jpg-to-pdf",
  },
  { name: "PDF OCR", icon: "icons/pdf-ocr.png", section: Section.ConvertToPDF, url: "https://smallpdf.com/pdf-ocr" },

  // Sign
  { name: "Sign PDF", icon: "icons/e-sign.png", section: Section.Sign, url: "https://smallpdf.com/sign-pdf" },
  {
    name: "Request Signatures (Sign.com)",
    icon: "icons/sign-com.png",
    section: Section.Sign,
    url: "https://sign.com/smallpdf?utm_source=smallpdf&utm_medium=nav&utm_content=tool-list",
  },

  // More
  { name: "Unlock PDF", icon: "icons/unlock.png", section: Section.More, url: "https://smallpdf.com/unlock-pdf" },
  { name: "Protect PDF", icon: "icons/protect.png", section: Section.More, url: "https://smallpdf.com/protect-pdf" },
  { name: "Flatten PDF", icon: "icons/flatten.png", section: Section.More, url: "https://smallpdf.com/flatten-pdf" },

  // Scan
  { name: "PDF Scanner", icon: "icons/scanner.png", section: Section.Scan, url: "https://smallpdf.com/pdf-scanner" },
];
