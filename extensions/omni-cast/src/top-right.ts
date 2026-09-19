import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Top Right", [
    ["command", "consume-or-expel-window-right"],
    ["command", "move-window-up"],
  ]);
