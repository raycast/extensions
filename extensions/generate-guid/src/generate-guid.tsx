import {Clipboard, getPreferenceValues, popToRoot, showHUD, showToast, Toast} from "@raycast/api";
import {v4 as uuidv4} from 'uuid';


export const capitalize = (value: string, lowercaseRest = false) => {
  const firstLetter = value.charAt(0).toUpperCase();
  const rest = lowercaseRest ? value.slice(1).toLowerCase() : value.slice(1);

  return firstLetter + rest;
};

export async function showCopySuccessMessage(title: string, message?: string) {
  const action = getPreferenceValues().windowActionOnCopy;
  const messageTitle = capitalize(title, true);

  if (action === "keepOpen") {
    await showToast({ title: messageTitle, message, style: Toast.Style.Success });
  } else if (action === "closeAndPopToRoot") {
    await showHUD(messageTitle);
    await popToRoot();
  } else {
    await showHUD(messageTitle);
  }
}

async function generateGUIDCommand() {
  const toast = await showToast(Toast.Style.Animated, "Generating GUID...");
  try {
    const guid = uuidv4();
    await Clipboard.copy(guid);
    await showCopySuccessMessage("Copied guid to clipboard");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to generate";
  }
}

export default generateGUIDCommand
