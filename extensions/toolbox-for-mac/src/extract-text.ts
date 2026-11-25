import { IMAGE, PDF, runOnFinderSelection } from "./lib/quick";

export default () =>
  runOnFinderSelection({
    tool: "extract_text",
    accept: [...IMAGE, ...PDF],
    noun: "images or PDFs",
    doing: "Reading text in",
    done: "Read",
    copyText: true,
  });
