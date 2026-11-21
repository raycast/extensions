import { DisplayPicker } from "./display-picker";
import { runAction } from "./utils";

export default function Command() {
  return (
    <DisplayPicker
      actionTitle="Disallow Dock on This Display"
      emptyTitle="No Allowed Displays"
      eligible={(display) => display.allowed}
      onSelect={(display) => runAction(["display", "allow", display.id, "off"], `Dock disallowed on ${display.name}`)}
    />
  );
}
