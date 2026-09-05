import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Center Third", [
    ["command", "set-container-primary-span", "33.333%"],
    ["command", "center-column"],
  ]);
