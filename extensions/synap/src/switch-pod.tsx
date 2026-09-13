/**
 * Switch Pod — standalone command to switch the active Synap pod in Raycast.
 * The switcher itself is shared with Connect (components/connection.tsx).
 */

import { PodSwitcher } from "./components/connection";

export default function SwitchPod() {
  return <PodSwitcher />;
}
