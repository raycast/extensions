import { generateHtmlDocument, produceOutput, randomDocumentBlockCount, showError } from "./utils";

export default async function HtmlCommand() {
  const output = generateHtmlDocument(randomDocumentBlockCount());

  try {
    await produceOutput(output);
  } catch {
    await showError("Failed to generate HTML content");
  }
}
