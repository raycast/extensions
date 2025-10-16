import { getSelectedText, LaunchProps, showHUD } from "@raycast/api";
import open from "open";

export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickCall }>) {
  const { fallbackText } = props;
  const { number } = props.arguments;

  let dialNumber = fallbackText || number;

  if (dialNumber === "") {
    try {
      const selectedText = await getSelectedText();
      if (selectedText !== "") {
        dialNumber = selectedText;
      }
    } catch (error) {
      console.error(error);
    }
  }

  // This line removes any non-numeric characters (except for the plus sign)
  // from the dialNumber string.
  dialNumber = dialNumber.replace(/[^0-9+]/g, "").trim();

  // If the input is empty, show an error toast and return
  if (dialNumber.length === 0) {
    await showHUD("You must enter a number before setting up a call");
    return;
  }

  try {
    await open(`tel://${dialNumber}`);
    await showHUD(`Opening facetime calling ${dialNumber}...`);
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(error.message);
    }
  }
}
