import { IMAGE, runOnFinderSelection } from "./lib/quick";

export default () =>
  runOnFinderSelection({
    tool: "compress_images",
    accept: IMAGE,
    noun: "images",
    doing: "Compressing",
    done: "Compressed",
  });
