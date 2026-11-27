import { runOnFinderSelection, VIDEO } from "./lib/quick";

export default () =>
  runOnFinderSelection({
    tool: "video_to_gif",
    accept: VIDEO,
    noun: "videos",
    doing: "Making GIFs from",
    done: "Made",
  });
