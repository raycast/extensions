import { Action, useNavigation } from "@raycast/api";
import { isWorkerRunning } from "../utils/admin-worker";
import ElevationSetup from "./ElevationSetup";

interface ElevatedActionProps {
  icon?: Action.Props["icon"];
  title: Action.Props["title"];
  style?: Action.Props["style"];
  shortcut?: Action.Props["shortcut"];
  onAction: () => void | Promise<void>;
}

/**
 * A wrapper around Raycast <Action> for commands requiring Windows Administrator privileges.
 *
 * Renders instantly; registration is verified on click. If the admin worker is running,
 * `onAction` executes directly. Otherwise pushes `<ElevationSetup />`.
 */
export function ElevatedAction({ icon, title, style, shortcut, onAction }: ElevatedActionProps) {
  const { push } = useNavigation();

  async function handlePress() {
    if (!(await isWorkerRunning())) {
      push(<ElevationSetup onSetupSuccess={() => onAction()} />);
      return;
    }

    await onAction();
  }

  return <Action icon={icon} title={title} style={style} shortcut={shortcut} onAction={handlePress} />;
}
