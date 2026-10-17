import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("First Two Thirds", [
    ["command", "set-container-primary-span", "66.667%"],
    ["command", "move-column-to-first"],
  ]);
