import { generateMarkdownDocument, produceOutput, randomDocumentBlockCount, showError } from "./utils";

export default async function MarkdownCommand() {
  const output = generateMarkdownDocument(randomDocumentBlockCount());

  try {
    await produceOutput(output);
  } catch {
    await showError("Failed to generate Markdown content");
  }
}
