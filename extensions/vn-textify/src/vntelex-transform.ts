import { getSelectedText, Clipboard, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { telexTransform } from "./telex";
const defaultSkipWords = [
  "access",
  "actor",
  "class",
  "color",
  "complex",
  "core",
  "doctor",
  "door",
  "error",
  "ex",
  "favor",
  "fix",
  "floor",
  "focus",
  "for",
  "fox",
  "if",
  "index",
  "major",
  "mass",
  "minor",
  "minus",
  "monitor",
  "motor",
  "nor",
  "of",
  "pass",
  "plus",
  "process",
  "proof",
  "relax",
  "roof",
  "self",
  "sensor",
  "status",
  "stress",
  "stuff",
  "success",
  "text",
  "virus",
  "yes",
  "are",
  "good",
];

function loadSkipWords(): string[] {
  const { customSkipWords } = getPreferenceValues<{ customSkipWords?: string }>();
  if (!customSkipWords) return defaultSkipWords;
  const custom = customSkipWords
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

  return custom.length ? [...new Set([...defaultSkipWords, ...custom])] : defaultSkipWords;
}

export default async function Command() {
  try {
    const selectedText = await getSelectedText();

    if (!selectedText.trim()) {
      return;
    }

    await Clipboard.paste(telexTransform(selectedText, loadSkipWords()));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot transform text",
      message: String(error),
    });
  }
}
