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
  icon: string;
  section: Section;
  url: string;
  description: string;
};

// Utility function to add Raycast UTM parameters to URLs
const addRaycastUTM = (baseUrl: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", "raycast");
  url.searchParams.set("utm_medium", "smallpdf-extension");
  url.searchParams.set("utm_campaign", "quick-links");
  return url.toString();
};

export const tools: Tool[] = [
  // Compress
  {
    name: "Compress PDF",
    icon: "icons/compress.png",
    section: Section.Compress,
    url: addRaycastUTM("https://smallpdf.com/compress-pdf"),
    description: "Reduce PDF file size while maintaining quality",
  },

  // Convert
  {
    name: "PDF Converter",
    icon: "icons/converter.png",
    section: Section.Convert,
    url: addRaycastUTM("https://smallpdf.com/pdf-converter"),
    description: "Convert files to and from PDF format",
  },

  // AI PDF
  {
    name: "Chat with PDF",
    icon: "icons/ai-chat.png",
    section: Section.AIPDF,
    url: addRaycastUTM("https://smallpdf.com/chat-pdf"),
    description: "Ask questions and get instant answers from your PDF",
  },
  {
    name: "AI PDF Summarizer",
    icon: "icons/ai-summarize.png",
    section: Section.AIPDF,
    url: addRaycastUTM("https://smallpdf.com/pdf-summarizer"),
    description: "Get AI-powered summaries of your PDF documents",
  },
  {
    name: "Translate PDF",
    icon: "icons/ai-translate.png",
    section: Section.AIPDF,
    url: addRaycastUTM("https://smallpdf.com/translate-pdf"),
    description: "Translate PDF content into different languages",
  },
  {
    name: "AI Question Generator",
    icon: "icons/ai-question.png",
    section: Section.AIPDF,
    url: addRaycastUTM("https://smallpdf.com/question-generator"),
    description: "Generate questions from your PDF content",
  },

  // Organize
  {
    name: "Merge PDF",
    icon: "icons/merge.png",
    section: Section.Organize,
    url: addRaycastUTM("https://smallpdf.com/merge-pdf"),
    description: "Combine multiple PDFs into a single document",
  },
  {
    name: "Split PDF",
    icon: "icons/split.png",
    section: Section.Organize,
    url: addRaycastUTM("https://smallpdf.com/split-pdf"),
    description: "Split PDF into multiple documents",
  },
  {
    name: "Rotate PDF",
    icon: "icons/rotate.png",
    section: Section.Organize,
    url: addRaycastUTM("https://smallpdf.com/rotate-pdf"),
    description: "Rotate PDF pages to the correct orientation",
  },
  {
    name: "Delete PDF Pages",
    icon: "icons/delete.png",
    section: Section.Organize,
    url: addRaycastUTM("https://smallpdf.com/delete-pages-from-pdf"),
    description: "Remove unwanted pages from your PDF",
  },
  {
    name: "Extract PDF Pages",
    icon: "icons/extract.png",
    section: Section.Organize,
    url: addRaycastUTM("https://smallpdf.com/extract-pdf-pages"),
    description: "Extract specific pages from your PDF",
  },
  {
    name: "Organize PDF",
    icon: "icons/organize.png",
    section: Section.Organize,
    url: addRaycastUTM("https://smallpdf.com/organize-pdf"),
    description: "Reorder and organize PDF pages",
  },

  // View & Edit
  {
    name: "Edit PDF",
    icon: "icons/edit.png",
    section: Section.ViewAndEdit,
    url: addRaycastUTM("https://smallpdf.com/edit-pdf"),
    description: "Edit text, images, and more in your PDF",
  },
  {
    name: "PDF Annotator",
    icon: "icons/annotate.png",
    section: Section.ViewAndEdit,
    url: addRaycastUTM("https://smallpdf.com/pdf-annotator"),
    description: "Add comments, highlights, and annotations",
  },
  {
    name: "PDF Reader",
    icon: "icons/reader.png",
    section: Section.ViewAndEdit,
    url: addRaycastUTM("https://smallpdf.com/pdf-reader"),
    description: "Read and view PDF documents online",
  },
  {
    name: "Number Pages",
    icon: "icons/number.png",
    section: Section.ViewAndEdit,
    url: addRaycastUTM("https://smallpdf.com/add-page-numbers-to-pdf"),
    description: "Add page numbers to your PDF",
  },
  {
    name: "Crop PDF",
    icon: "icons/crop.png",
    section: Section.ViewAndEdit,
    url: addRaycastUTM("https://smallpdf.com/crop-pdf"),
    description: "Crop and adjust PDF page margins",
  },
  {
    name: "Redact PDF",
    icon: "icons/redact.png",
    section: Section.ViewAndEdit,
    url: addRaycastUTM("https://smallpdf.com/redact-pdf"),
    description: "Remove sensitive information from PDFs",
  },
  {
    name: "Watermark PDF",
    icon: "icons/watermark.png",
    section: Section.ViewAndEdit,
    url: addRaycastUTM("https://smallpdf.com/watermark-pdf"),
    description: "Add text or image watermarks to PDFs",
  },
  {
    name: "Share PDF",
    icon: "icons/share.png",
    section: Section.ViewAndEdit,
    url: addRaycastUTM("https://smallpdf.com/share-document"),
    description: "Share PDFs securely with others",
  },

  // Convert from PDF
  {
    name: "PDF to Word",
    icon: "icons/pdf-word.png",
    section: Section.ConvertFromPDF,
    url: addRaycastUTM("https://smallpdf.com/pdf-to-word"),
    description: "Convert PDF to editable Word document",
  },
  {
    name: "PDF to Excel",
    icon: "icons/pdf-excel.png",
    section: Section.ConvertFromPDF,
    url: addRaycastUTM("https://smallpdf.com/pdf-to-excel"),
    description: "Convert PDF tables to Excel spreadsheets",
  },
  {
    name: "PDF to PPT",
    icon: "icons/pdf-ppt.png",
    section: Section.ConvertFromPDF,
    url: addRaycastUTM("https://smallpdf.com/pdf-to-ppt"),
    description: "Convert PDF to PowerPoint presentation",
  },
  {
    name: "PDF to JPG",
    icon: "icons/pdf-image.png",
    section: Section.ConvertFromPDF,
    url: addRaycastUTM("https://smallpdf.com/pdf-to-jpg"),
    description: "Convert PDF pages to JPG images",
  },

  // Convert to PDF
  {
    name: "Word to PDF",
    icon: "icons/pdf-word.png",
    section: Section.ConvertToPDF,
    url: addRaycastUTM("https://smallpdf.com/word-to-pdf"),
    description: "Convert Word documents to PDF",
  },
  {
    name: "Excel to PDF",
    icon: "icons/pdf-excel.png",
    section: Section.ConvertToPDF,
    url: addRaycastUTM("https://smallpdf.com/excel-to-pdf"),
    description: "Convert Excel spreadsheets to PDF",
  },
  {
    name: "PPT to PDF",
    icon: "icons/pdf-ppt.png",
    section: Section.ConvertToPDF,
    url: addRaycastUTM("https://smallpdf.com/ppt-to-pdf"),
    description: "Convert PowerPoint to PDF",
  },
  {
    name: "JPG to PDF",
    icon: "icons/pdf-image.png",
    section: Section.ConvertToPDF,
    url: addRaycastUTM("https://smallpdf.com/jpg-to-pdf"),
    description: "Convert images to PDF",
  },
  {
    name: "PDF OCR",
    icon: "icons/pdf-ocr.png",
    section: Section.ConvertToPDF,
    url: addRaycastUTM("https://smallpdf.com/pdf-ocr"),
    description: "Make text in scans searchable",
  },

  // Sign
  {
    name: "Sign PDF",
    icon: "icons/e-sign.png",
    section: Section.Sign,
    url: addRaycastUTM("https://smallpdf.com/sign-pdf"),
    description: "Sign PDF documents electronically",
  },
  {
    name: "Request Signatures (Sign.com)",
    icon: "icons/sign-com.png",
    section: Section.Sign,
    url: addRaycastUTM("https://sign.com/smallpdf"),
    description: "Request and collect signatures from others",
  },

  // More
  {
    name: "Unlock PDF",
    icon: "icons/unlock.png",
    section: Section.More,
    url: addRaycastUTM("https://smallpdf.com/unlock-pdf"),
    description: "Remove password protection from PDFs",
  },
  {
    name: "Protect PDF",
    icon: "icons/protect.png",
    section: Section.More,
    url: addRaycastUTM("https://smallpdf.com/protect-pdf"),
    description: "Add password protection to PDFs",
  },
  {
    name: "Flatten PDF",
    icon: "icons/flatten.png",
    section: Section.More,
    url: addRaycastUTM("https://smallpdf.com/flatten-pdf"),
    description: "Make your PDFs uneditable",
  },

  // Scan
  {
    name: "PDF Scanner",
    icon: "icons/scanner.png",
    section: Section.Scan,
    url: addRaycastUTM("https://smallpdf.com/pdf-scanner"),
    description: "Create PDFs from scans on your mobile",
  },
];
