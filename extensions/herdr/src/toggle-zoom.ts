import { quickHerdrAction } from "./lib/quick-actions";
export default () => quickHerdrAction(["pane", "zoom", "--toggle"], "Toggling zoom", "Pane Zoom Toggled");
