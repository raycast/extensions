import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Move Left", [["command", "move-column", "left"]]);
