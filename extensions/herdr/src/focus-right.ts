import { quickHerdrAction } from "./lib/quick-actions";
export default () => quickHerdrAction(["pane", "focus", "--direction", "right"], "Focusing pane", "Focused Right");
