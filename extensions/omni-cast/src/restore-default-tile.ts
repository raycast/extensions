import { runStandaloneTiledOmniWM } from "./omniwm";

export default () =>
  runStandaloneTiledOmniWM("Reset", [
    ["command", "set-container-primary-span", "50%"],
    ["command", "reset-window-secondary-span"],
  ]);
