import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Move to Display Left", [["command", "move-to-monitor", "left"]]);
