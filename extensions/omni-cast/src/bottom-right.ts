import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Bottom Right", [["command", "consume-or-expel-window-right"]]);
