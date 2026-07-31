import { quickHerdrAction } from "./lib/quick-actions";
export default () => quickHerdrAction(["pane", "focus", "--direction", "down"], "Focusing pane", "Focused Down");
