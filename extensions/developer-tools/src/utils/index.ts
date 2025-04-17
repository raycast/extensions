import { Clipboard, getSelectedText } from "@raycast/api";

export const getInputText = async () => {
  const inputs = await Promise.all([getSelectedText(), Clipboard.readText()]);
  return inputs.filter((input) => Boolean(input)) as string[];
};
