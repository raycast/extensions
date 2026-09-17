import { quickHerdrAction } from "./lib/quick-actions";
export default () =>
  quickHerdrAction(["pane", "split", "--direction", "right", "--focus"], "Splitting pane", "Pane Split Right");
