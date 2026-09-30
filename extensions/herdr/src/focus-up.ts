import { quickHerdrAction } from "./lib/quick-actions";
export default () => quickHerdrAction(["pane", "focus", "--direction", "up"], "Focusing pane", "Focused Up");
