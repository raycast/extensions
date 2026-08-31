import { quickHerdrAction } from "./lib/quick-actions";
export default () =>
  quickHerdrAction(["pane", "split", "--direction", "down", "--focus"], "Splitting pane", "Pane Split Down");
