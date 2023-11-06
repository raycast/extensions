import { getPreferenceValues } from "@raycast/api";
import fs from "fs";

const { private_key, client_email } = getPreferenceValues();
function handleNewLines(text: string) {
  const newLine = getPreferenceValues<Preferences>().newLine;

  if (newLine === "replaceSpace") {
    return text.replace(/\n/g, " ");
  }
  if (newLine === "replaceBreak") {
    return text.replace(/\n/g, "<br>");
  }

  return text;
}

const isTesseractInstalled = async () => {
  return fs.existsSync(getPreferenceValues<Preferences>().tesseract_path);
};

async function checkGoogleCredentials() {
  return !(!private_key || !client_email);
}

const utils = {
  handleNewLines,
  isTesseractInstalled,
  checkGoogleCredentials,
};
export default utils;
