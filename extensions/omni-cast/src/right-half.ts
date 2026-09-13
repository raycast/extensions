import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Right Half", [["command", "set-container-primary-span", "50%"]]);
