import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Maximize Width", [
    ["command", "toggle-container-full-primary-span"],
  ]);
