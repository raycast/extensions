import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Workspace 5", [["command", "switch-workspace", "5"]]);
