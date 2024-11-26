import { ActionPanel, Action, List, showToast, Toast, Clipboard } from "@raycast/api";

export default function Command() {
  const formatText = async (numBreaks: number) => {
    try {
      // Get text from clipboard
      const clipboardContent = (await Clipboard.read()) as unknown;

      // Log the type and value of the clipboard content
      console.log("Clipboard content:", clipboardContent);
      console.log("Type of clipboard content:", typeof clipboardContent);

      // Ensure clipboard content is a string
      let text: string;
      if (typeof clipboardContent === "string") {
        text = clipboardContent;
      } else if (clipboardContent && typeof clipboardContent === "object" && "text" in clipboardContent) {
        // Access the 'text' property if it's an object
        text = (clipboardContent as { text: string }).text;
      } else {
        throw new TypeError("Clipboard content is not a string. Please copy text content.");
      }

      // Split into paragraphs (handling multiple possible line break types)
      const paragraphs = text.split(/\r\n|\r|\n/);

      // Remove empty paragraphs and strip whitespace
      const cleanParagraphs = paragraphs.map((p) => p.trim()).filter((p) => p.length > 0);

      // Join with specified number of line breaks
      const separator = "\n".repeat(numBreaks);
      const formattedText = cleanParagraphs.join(separator);

      // Copy back to clipboard
      await Clipboard.copy(formattedText);
      console.log("Formatted text copied to clipboard:", formattedText); // Log the copied text

      // Optional: Add a small delay
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100 ms delay

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: "Text formatted and copied to clipboard!",
        message: `You can now paste it using Command + V or Ctrl + V. Please close this window manually.`,
      });

      // Optional: Add a small delay before the toast disappears
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
    } catch (error) {
      console.error("Error formatting text:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to format text",
        message: String(error),
      });
    }
  };

  return (
    <List>
      <List.Item
        icon="1️⃣"
        title="Single Line Break"
        subtitle="Format with one line between paragraphs"
        actions={
          <ActionPanel>
            <Action title="Format with Single Break" onAction={() => formatText(1)} />
          </ActionPanel>
        }
      />
      <List.Item
        icon="2️⃣"
        title="Double Line Break"
        subtitle="Format with two lines between paragraphs"
        actions={
          <ActionPanel>
            <Action title="Format with Double Break" onAction={() => formatText(2)} />
          </ActionPanel>
        }
      />
    </List>
  );
}
