import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Top Left", [
    ["command", "consume-or-expel-window-left"],
    ["command", "move-window-up"],
  ]);
