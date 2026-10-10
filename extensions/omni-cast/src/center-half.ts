import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Center Half", [
    ["command", "set-container-primary-span", "50%"],
    ["command", "center-column"],
  ]);
