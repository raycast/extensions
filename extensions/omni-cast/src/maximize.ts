import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Maximize", [["command", "toggle-container-full-primary-span"]]);
