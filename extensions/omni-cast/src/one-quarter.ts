import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("One Quarter", [["command", "set-container-primary-span", "25%"]]);
