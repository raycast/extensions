import { DisplayPicker } from "./display-picker";
import { runAction } from "./utils";

export default function Command() {
  return (
    <DisplayPicker
      actionTitle="Allow Dock on This Display"
      emptyTitle="No More Compatible Displays to Allow"
      eligible={(display) => display.compatible && !display.allowed}
      onSelect={(display) => runAction(["display", "allow", display.id, "on"], `Dock allowed on ${display.name}`)}
    />
  );
}
