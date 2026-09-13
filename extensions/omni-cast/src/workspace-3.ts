import { runOmniWM } from "./omniwm";

export default () =>
  runOmniWM("Workspace 3", [["command", "switch-workspace", "3"]]);
