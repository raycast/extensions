import { confirmAlert, getSelectedText } from "@raycast/api";
import { pasteText } from "./paste-text";

export default async function PasteSelectedText() {
  await pasteText(
    getSelectedText,
    "No text selected",
    "Select some text in the frontmost app first.",
    async (content) =>
      confirmAlert({
        title: "Upload selected text?",
        message: `This creates a public paste on paste.rs. Anyone with the link can view it.\n\n${content.slice(0, 200)}${content.length > 200 ? "…" : ""}`,
        primaryAction: { title: "Create Paste" },
      }),
  );
}
