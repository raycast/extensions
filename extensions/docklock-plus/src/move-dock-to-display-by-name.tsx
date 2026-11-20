import { DisplayPicker } from "./display-picker";
import { runAction } from "./utils";

export default function Command() {
  return (
    <DisplayPicker
      actionTitle="Move Dock to This Display"
      emptyTitle="No Other Compatible Displays"
      eligible={(display) => display.compatible && display.dockHere !== true}
      onSelect={(display) =>
        runAction(["dock", "move", "--display", display.id], `Dock move to ${display.name} requested`)
      }
    />
  );
}
