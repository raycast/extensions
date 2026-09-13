import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Workspace 1", [["command", "switch-workspace", "1"]]);
