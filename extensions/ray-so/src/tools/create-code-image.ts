import { getPreferenceValues, open } from "@raycast/api";
import { createRaySoUrl } from "../utils";

type Input = {
  /** Code to display. Preserve the user's code and whitespace unless they ask for changes. */
  code: string;
  /** Optional filename or title displayed above the code. */
  title?: string;
  /** Theme ID from get-image-options. Omit to use the user's saved default. */
  theme?: string;
  /** Padding in pixels: 16, 32, 64, or 128. Omit to use the user's saved default. */
  padding?: number;
  /** Omit to use the user's saved default. False selects light mode. */
  darkMode?: boolean;
  /** Omit to use the user's saved default. False removes the gradient background. */
  background?: boolean;
  /** Language ID from get-image-options. Omit to auto-detect the language. */
  language?: string;
  /** Open the editor in the browser. Defaults to true; set false when the user only wants a link. */
  openInBrowser?: boolean;
};

/** Create a ray.so editor link using saved defaults and optional overrides. This does not export an image file. */
export default async function createCodeImage(input: Input) {
  if (!input.code.trim()) {
    throw new Error("Provide the code to turn into an image.");
  }
  if (input.padding !== undefined && ![16, 32, 64, 128].includes(input.padding)) {
    throw new Error("Padding must be 16, 32, 64, or 128 pixels.");
  }

  const preferences = getPreferenceValues<Preferences>();
  const settings = {
    theme: input.theme ?? preferences.theme,
    padding: String(input.padding ?? preferences.padding),
    darkMode: input.darkMode ?? preferences.darkMode,
    background: input.background ?? preferences.background,
    language: input.language ?? "auto",
  };
  const title = input.title || "Untitled 1";
  const url = createRaySoUrl({ ...settings, title, code: input.code });
  const openedInBrowser = input.openInBrowser ?? true;
  if (openedInBrowser) await open(url);

  return { url, title, settings, openedInBrowser, imageExported: false };
}
