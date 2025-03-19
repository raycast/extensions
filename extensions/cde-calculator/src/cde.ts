import { showHUD, LaunchProps, Clipboard, getSelectedText, closeMainWindow } from "@raycast/api";

interface CommandArgs {
  hours?: string;
  minutes?: string;
}

export default async function command(props: LaunchProps<{ arguments: CommandArgs }>) {
  // Get arguments, handle undefined or empty strings
  const hoursStr = props.arguments.hours || "0";
  const minutesStr = props.arguments.minutes || "0";

  try {
    // Parse hours and minutes to numbers
    const hoursInput = parseFloat(hoursStr);
    const minutesInput = parseFloat(minutesStr);

    // Check if parsing was successful
    if (isNaN(hoursInput)) {
      await showHUD("Hours must be a valid number");
      return;
    }

    if (isNaN(minutesInput)) {
      await showHUD("Minutes must be a valid number");
      return;
    }

    // Close Raycast window immediately to prevent focus issues
    await closeMainWindow();

    // Get CDE from selected text
    const cdeInput = await getSelectedText();

    const cde = parseFloat(cdeInput);

    if (isNaN(cde)) {
      await showHUD("Selected text is not a valid number for CDE");
      return;
    }

    // Validate hours and minutes
    if (hoursInput < 0) {
      await showHUD("Hours must be a positive number");
      return;
    }

    if (minutesInput < 0 || minutesInput >= 60) {
      await showHUD("Minutes must be a number between 0 and 59");
      return;
    }

    const newCde = calculateNewCde(cde, hoursInput, minutesInput);
    const newCdeString = newCde.toString();

    // Copy the new value to clipboard
    await Clipboard.copy(newCdeString);

    // Add a small delay to ensure focus returns to the previous application
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Paste the new CDE value at the cursor position
    await Clipboard.paste(newCdeString);

    await showHUD(`Updated CDE: ${newCde}`);
  } catch (error) {
    if (error instanceof Error) {
      await showHUD(error.message);
    } else {
      await showHUD("Please select a CDE value as text before running the command");
    }
  }
}

function calculateNewCde(cde: number, hours: number, minutes: number): number {
  // Convert minutes to hours
  const totalHoursSpent = hours + minutes / 60;

  // Subtract time spent from the current estimate
  const newCde = cde - totalHoursSpent;

  // Round to 2 decimal places and ensure we don't go negative
  return Math.max(0, Math.round(newCde * 100) / 100);
}
