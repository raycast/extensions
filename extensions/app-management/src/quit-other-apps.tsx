// Hotkey command "Quit Other Apps" (owner request, 2026-09-30): mounts the list with a startup action that quits every
// running app in the list except the row the open list had selected, after the list's confirmation.
import { AppList } from "./app-list.tsx";

export default function Command() {
  return <AppList startup="quit-others" />;
}
