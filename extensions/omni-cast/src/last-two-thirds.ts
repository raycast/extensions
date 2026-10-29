import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Last Two Thirds", [
    ["command", "set-container-primary-span", "66.667%"],
    ["command", "move-column-to-last"],
  ]);
