import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Left Half", [["command", "set-container-primary-span", "50%"]]);
