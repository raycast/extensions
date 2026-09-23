import { closeMainWindow } from "@raycast/api";
import { showFailure } from "./feedback";
import { addEventForEditing } from "./hora";

/**
 * The counterpart to Quick Add Event: hora comes forward with its editor
 * already filled in, so the sentence can be corrected before anything is
 * saved. Raycast gets out of the way first, since hora is about to take over
 * the screen.
 */
export default async function Command(props: { arguments: { sentence: string } }) {
  try {
    await closeMainWindow();
    await addEventForEditing(props.arguments.sentence);
  } catch (error) {
    await showFailure(error, "Could not open the event in hora");
  }
}
