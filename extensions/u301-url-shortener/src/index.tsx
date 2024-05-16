import { getSelectedText, Clipboard, showToast, Toast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

function isValidURL(string: string) {
  const res = string.match(
    /(http(s)?:\/\/.)(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g,
  );
  return res !== null;
}

async function reportError({ message }: { message: string }) {
  await showToast(Toast.Style.Failure, "Error", message.toString());
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues();
    const selectedText = await getSelectedText();
    if (!isValidURL(selectedText)) {
      return reportError({ message: "Selected text is not a valid URL" });
    }

    showToast({
      style: Toast.Style.Animated,
      title: "Shortening",
    });
    const res = await fetch(`https://api.u301.com/v2/shorten?url=${encodeURIComponent(selectedText)}`);
    const { shortened, message = "Failed to shorten" } = (await res.json()) as { shortened: string; message?: string };
    if (!shortened) {
      return reportError({ message });
    }
    if (preferences.clipboard === "clipboard") {
      await Clipboard.copy(shortened);
    } else {
      await Clipboard.paste(shortened);
    }
  } catch (error) {
    return reportError({
      message: "Not able to get selected text",
    });
  }

  await showToast(Toast.Style.Success, "Success", "Copied shortened URL to clipboard");
}
