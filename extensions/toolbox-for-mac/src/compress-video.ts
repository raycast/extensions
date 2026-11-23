import { runOnFinderSelection, VIDEO } from "./lib/quick";

export default () =>
  runOnFinderSelection({
    tool: "compress_video",
    accept: VIDEO,
    noun: "videos",
    doing: "Compressing",
    done: "Compressed",
  });
