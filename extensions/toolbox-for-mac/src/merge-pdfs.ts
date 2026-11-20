import { IMAGE, PDF, runOnFinderSelection } from "./lib/quick";

export default () =>
  runOnFinderSelection({
    tool: "merge_pdfs",
    accept: [...PDF, ...IMAGE],
    noun: "PDFs or images",
    doing: "Merging",
    done: "Merged into",
    minFiles: 2,
  });
