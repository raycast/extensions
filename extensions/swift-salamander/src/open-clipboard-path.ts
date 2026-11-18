import { Clipboard } from "@raycast/api";
import { clipboardPathInput } from "./path-input";
import { openFields, runCommand, send } from "./salamander";

export default async function Command() {
  await runCommand(async () => {
    const text = await Clipboard.readText();
    await send("open", openFields([clipboardPathInput(text ?? "")]));
  });
}
