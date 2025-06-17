import { showToast, Toast, Clipboard } from "@raycast/api";
import { generateFrontmatter } from "./frontmatter";

export async function handleSaveError(error: Error, content: string) {
  // First, show the error
  await showToast({
    style: Toast.Style.Failure,
    title: "Failed to save",
    message: error.message,
  });

  // Copy to clipboard as a safety measure
  const frontmatter = generateFrontmatter();
  const fullContent = `${frontmatter}\n${content}`;

  await Clipboard.copy(fullContent);
  await showToast({
    style: Toast.Style.Success,
    title: "Copied to clipboard",
    message: "Your content is safe in the clipboard",
  });
}
