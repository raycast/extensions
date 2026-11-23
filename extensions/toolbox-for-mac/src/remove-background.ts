import { IMAGE, runOnFinderSelection } from "./lib/quick";

export default () =>
  runOnFinderSelection({
    tool: "remove_image_background",
    accept: IMAGE,
    noun: "photos",
    doing: "Removing the background from",
    done: "Cut out",
  });
