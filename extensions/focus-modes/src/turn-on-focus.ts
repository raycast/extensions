import { LaunchProps, showHUD } from "@raycast/api";
import { getFocusState, showFocusError, turnOnFocus } from "./focus";

export default async function Command(props: LaunchProps<{ arguments: Arguments.TurnOnFocus }>) {
  const query = props.arguments.focus.trim();
  try {
    const { modes } = await getFocusState();
    const name = query.toLowerCase();
    // Quicklinks pass the mode identifier; people type its name, or the start of it.
    const mode =
      modes.find((mode) => mode.id === query) ??
      modes.find((mode) => mode.name.toLowerCase() === name) ??
      modes.find((mode) => mode.name.toLowerCase().startsWith(name));
    if (!mode) {
      await showHUD(`No Focus named “${query}”`);
      return;
    }
    await turnOnFocus(mode, modes);
  } catch (error) {
    await showFocusError(error, "Couldn’t turn on Focus");
  }
}
