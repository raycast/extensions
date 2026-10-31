// Hotkey command "Quit Selected App" (owner request, 2026-09-30): mounts the list with a startup action that quits the
// row the open list had selected. A view command, so pressing the hotkey while the list is open re-mounts the same
// list in place (no window hide/show) and the quit runs with the new scan's pids.
import { AppList } from "./app-list.tsx";

export default function Command() {
  return <AppList startup="quit-selected" />;
}
