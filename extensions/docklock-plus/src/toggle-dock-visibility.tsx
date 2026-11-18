import { runAction } from "./utils";

export default function Command() {
  return runAction(["dock", "hide", "toggle"], "Dock visibility toggled");
}
