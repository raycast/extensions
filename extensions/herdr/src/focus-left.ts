import { quickHerdrAction } from "./lib/quick-actions";
export default () => quickHerdrAction(["pane", "focus", "--direction", "left"], "Focusing pane", "Focused Left");
