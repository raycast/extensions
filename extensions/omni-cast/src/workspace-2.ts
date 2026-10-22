import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Workspace 2", [["command", "switch-workspace", "2"]]);
