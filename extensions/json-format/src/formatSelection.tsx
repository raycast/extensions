import { getSelectedText } from "@raycast/api";
import { formatJS, copyFormattedJs } from "./utils";

export default async () => {
  const output = await formatJS(await getSelectedText());

  if (output) {
    await copyFormattedJs(output);
  }
};
