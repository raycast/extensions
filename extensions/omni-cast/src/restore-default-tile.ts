import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Reset", [
    ["command", "expel-window-from-column"],
    ["command", "set-container-primary-span", "50%"],
    ["command", "reset-window-secondary-span"],
  ]);
