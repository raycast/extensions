import { Clipboard, getSelectedText, LaunchProps, open, showHUD } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickCall }>) {
  // Both can be undefined: `fallbackText` is only set when launched as a
  // fallback command, and `arguments.number` is undefined (not "") when the
  // command is launched via hotkey or deeplink without typing an argument.
  let dialNumber = (props.fallbackText ?? props.arguments?.number ?? "").trim();

  if (dialNumber === "") {
    try {
      dialNumber = (await getSelectedText()).trim();
    } catch {
      // No text selected in the frontmost app — fall through to the clipboard.
    }
  }

  if (dialNumber === "") {
    try {
      dialNumber = ((await Clipboard.readText()) ?? "").trim();
    } catch {
      // Clipboard unavailable or non-text — handled by the empty check below.
    }
  }

  // Keep digits only, preserving at most a single leading plus sign.
  const hasLeadingPlus = dialNumber.startsWith("+");
  const digits = dialNumber.replace(/\D/g, "");
  dialNumber = hasLeadingPlus && digits.length > 0 ? `+${digits}` : digits;

  if (dialNumber.length === 0) {
    await showHUD("You must enter or select a phone number before setting up a call");
    return;
  }

  try {
    await open(`tel://${dialNumber}`);
    await showHUD(`Calling ${dialNumber}...`);
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : "Could not start the call");
  }
}
