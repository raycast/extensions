import { getPreferenceValues } from "@raycast/api";
import { generateParagraph, preformAction } from "./utils";

export default async function ParagraphCommand() {
  const { action = "clipboard" } = getPreferenceValues();
  const output = generateParagraph();

  await preformAction(action, output);

  return null;
}
