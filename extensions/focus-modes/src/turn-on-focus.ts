import { LaunchProps, showHUD } from "@raycast/api";
import { showFocusError, turnOnFocus } from "./focus";
import { getFocusState } from "./focus-state";

export default async function Command(props: LaunchProps<{ arguments: Arguments.TurnOnFocus }>) {
  const query = props.arguments.focus.trim();
  // Deeplinks can pass an empty argument, which would otherwise prefix-match the first Focus.
  if (!query) {
    await showHUD("Type the name of a Focus to turn on");
    return;
  }
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
