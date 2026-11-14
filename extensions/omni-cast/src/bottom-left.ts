import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Bottom Left", [["command", "consume-or-expel-window-left"]]);
