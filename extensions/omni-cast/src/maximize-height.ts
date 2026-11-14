import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Maximize Height", [
    ["command", "set-window-secondary-span", "100%"],
  ]);
