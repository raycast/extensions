import { Clipboard, Toast, getPreferenceValues, getSelectedText, showToast } from "@raycast/api";
import { exec } from "child_process";

export const handleInput = async (handle_type: Preferences["primary_handle"] | Preferences["secondary_handle"]) => {
  try {
    const selectedText = await getSelectedText();
    const isValidInput = await validateInput(selectedText, handle_type);
    if (isValidInput) {
      const processedNames = await handleSort(selectedText, handle_type);
      await handleOutput(processedNames);
    }
  } catch (error) {
    if (error instanceof Error) {
      await showToast(Toast.Style.Failure, error.message);
      return;
    }
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
const handleSort = async (text: string, handle: string): Promise<string> => {
  try {
    return text
      .split(handle)
      .map((username) => username.trim())
      .filter((username) => username)
      .sort((a, b) => a.localeCompare(b))
      .map((username) => `${handle}${username}`)
      .join(" ");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Something went wrong");
    throw error;
  }
};

const OUTPUT_HANDLING_MAP = {
  copy: { message: "Copied to clipboard", method: Clipboard.copy },
  paste: { message: "Sorted and replaced!", method: Clipboard.paste },
};

const handleOutput = async (processedNames: string) => {
  const { default_action } = getPreferenceValues<Preferences>();
  await OUTPUT_HANDLING_MAP[default_action].method(processedNames);
  await showToast(Toast.Style.Success, OUTPUT_HANDLING_MAP[default_action].message);
  handlePlaySuccessSound();
};

const validateInput = async (selectedText: string, handle: string): Promise<boolean> => {
  if (!selectedText.trim()) {
    await showToast(Toast.Style.Failure, `No text selected`);
    return false;
  }
  if (!selectedText.includes(handle)) {
    await showToast(Toast.Style.Failure, `Invalid input: prefix "${handle}" not found`);
    return false;
  }
  return true;
};

const handlePlaySuccessSound = () => {
  const { should_play_sound_on_success } = getPreferenceValues<Preferences>();
  if (!should_play_sound_on_success) {
    return;
  }
  exec("afplay /System/Library/Sounds/Frog.aiff", async (error) => {
    if (error) {
      await showToast(Toast.Style.Failure, `Couldn't play sound file`);
    }
  });
};
