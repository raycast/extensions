import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Three Quarters", [
    ["command", "set-container-primary-span", "75%"],
  ]);
