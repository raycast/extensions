import { LaunchProps, Toast, environment, getSelectedText, showToast } from "@raycast/api";
import figlet, { Fonts } from "figlet";
import fs from "fs";
import path from "path";

export async function renderFiglet(figletFont: Fonts, text: string) {
  try {
    figlet.parseFont(figletFont, fs.readFileSync(path.join(environment.assetsPath, `fonts/${figletFont}.flf`), "utf8"));
    return figlet.textSync(text, { font: figletFont });
  } catch (err: unknown) {
    showToast(Toast.Style.Failure, (err as Error).message);
    return false;
  }
}

export async function getFigletText(
  props: LaunchProps<{ arguments: { font: string; text: string } }>,
  defaultFont: string,
  fallbackText: string,
) {
  const { font, text } = props.arguments;
  const figletFont = font || defaultFont;

  let figgleText = text || fallbackText;
  if (!figgleText) {
    try {
      figgleText = await getSelectedText();
    } catch (error) {
      console.error(error);
    }
  }

  if (!figgleText) {
    await showToast(Toast.Style.Failure, "No text selected", "Please either set- or select a text");
    return;
  }

  return { figletFont, figgleText };
}
