import { Base64 } from "js-base64";
import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { maxPromptLength } from "@ts/constants";

const IMGPROXY_URL = "https://img.stablecog.com";

type TImgProxyPreset =
  | "32w"
  | "64w"
  | "128w"
  | "256w"
  | "512w"
  | "768w"
  | "1024w"
  | "1536w"
  | "1920w"
  | "2560w"
  | "3840w"
  | "full";

type TExtention = "jpeg" | "webp" | "png";

const extentionDefault: TExtention = "webp";

function getImgProxySrc({
  src,
  preset,
  extention = extentionDefault,
}: {
  src: string;
  preset: TImgProxyPreset;
  extention?: TExtention;
}) {
  return `${IMGPROXY_URL}/insecure/${preset}/${Base64.encodeURL(src)}.${extention}`;
}

export function getThumbnailImgUrl(src: string, gridSize: number) {
  return getImgProxySrc({ src, preset: gridSize === 2 ? "768w" : "512w" });
}

interface SaveImageProps {
  url: string;
  id: string;
}

export const saveImage = async ({ url, id }: SaveImageProps) => {
  try {
    await showHUD("Please select a location to save the image...");
    await runAppleScript(`
      set outputFolder to choose folder with prompt "Please select an output folder:"
      set temp_folder to (POSIX path of outputFolder) & "${id}.${url.split(".").pop()}"
      set q_temp_folder to quoted form of temp_folder
      set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd
    `);
  } catch (err) {
    console.error(err);
    await showHUD("Couldn't save the image...");
  }
};

const multiLineBreaksRegex = /\n\s*\n/g;
const singleLineBreaksRegex = /\n/g;

export const removeLineBreaks = (text: string): string => {
  return text.replace(multiLineBreaksRegex, "\n").replace(singleLineBreaksRegex, " ");
};

export const removeSuffixSpaces = (text: string): string => {
  return text.replace(/\s+$/, "");
};

export const removeRedundantSpaces = (text: string): string => {
  return text.replace(/\s+/g, " ");
};

export const formatPrompt = (text: string | undefined): string => {
  if (!text) return "";
  return removeRedundantSpaces(removeSuffixSpaces(removeLineBreaks(text.slice(0, maxPromptLength))));
};
