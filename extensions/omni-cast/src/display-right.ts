import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Move to Display Right", [["command", "move-to-monitor", "right"]]);
