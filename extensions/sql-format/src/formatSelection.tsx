import { getSelectedText } from "@raycast/api";
import { formatSQL, copyFormattedSQL } from "./utils";

export default async () => {
  const output = formatSQL(await getSelectedText());
  if (output) {
    await copyFormattedSQL(output);
  }
};
