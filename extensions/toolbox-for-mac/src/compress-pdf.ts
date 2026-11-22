import { PDF, runOnFinderSelection } from "./lib/quick";

export default () =>
  runOnFinderSelection({ tool: "compress_pdf", accept: PDF, noun: "PDFs", doing: "Compressing", done: "Compressed" });
