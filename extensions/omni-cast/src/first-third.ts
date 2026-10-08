import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("First Third", [
    ["command", "set-container-primary-span", "33.333%"],
    ["command", "move-column-to-first"],
  ]);
