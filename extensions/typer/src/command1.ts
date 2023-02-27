import { Clipboard, getPreferenceValues } from "@raycast/api";
export default async function main() {
  const values = getPreferenceValues();
  const value = values["typercommand1"];
  if (value) {
    Clipboard.paste(value);
  }
}
