import { Clipboard, getPreferenceValues } from "@raycast/api";
export default async function main() {
  const values = getPreferenceValues();
  const value = values["typercommand3"];
  if (value) {
    Clipboard.paste(value);
  }
}
