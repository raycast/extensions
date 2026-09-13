import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Move Right", [["command", "move-column", "right"]]);
