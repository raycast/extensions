import React from "react";
import { Detail, showToast, Toast, getSelectedText, Clipboard } from "@raycast/api";
import { decompressAsString } from "./utils/decompress";

export default function Command() {
  return <DecompressView />;
}

function DecompressView() {
  const [content, setContent] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [originalSize, setOriginalSize] = React.useState<number>(0);
  const [decompressedSize, setDecompressedSize] = React.useState<number>(0);

  React.useEffect(() => {
    async function performDecompression() {
      try {
        // Try to get selected text first, then fallback to clipboard
        let textToDecompress: string;

        try {
          textToDecompress = await getSelectedText();
        } catch {
          // If no text is selected, read from clipboard
          const clipboardText = await Clipboard.readText();
          if (!clipboardText) {
            setError("No text found. Please select text or copy text to your clipboard first.");
            setIsLoading(false);
            return;
          }
          textToDecompress = clipboardText;
        }

        if (!textToDecompress.trim()) {
          setError("The selected or clipboard text is empty.");
          setIsLoading(false);
          return;
        }

        setOriginalSize(textToDecompress.length);

        // Decompress the text
        let decompressedText: string;
        try {
          decompressedText = decompressAsString(textToDecompress.trim());
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          setError(
            `Failed to decompress the text: ${errorMessage}. Make sure the input is valid Brotli compressed data.`,
          );
          console.error("Decompression error:", error);
          setIsLoading(false);
          return;
        }

        setDecompressedSize(decompressedText.length);

        // Try to format as JSON if it's valid JSON
        let formattedContent = decompressedText;

        try {
          const parsed = JSON.parse(decompressedText);
          formattedContent = "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
        } catch {
          // Not JSON, check if it looks like code
          if (
            decompressedText.includes("function") ||
            decompressedText.includes("const") ||
            decompressedText.includes("import")
          ) {
            formattedContent = "```javascript\n" + decompressedText + "\n```";
          } else if (decompressedText.includes("<html") || decompressedText.includes("<!DOCTYPE")) {
            formattedContent = "```html\n" + decompressedText + "\n```";
          } else if (decompressedText.includes("<?xml") || decompressedText.includes("<root")) {
            formattedContent = "```xml\n" + decompressedText + "\n```";
          } else {
            // Plain text with proper formatting
            formattedContent = "```\n" + decompressedText + "\n```";
          }
        }

        setContent(formattedContent);
        setIsLoading(false);

        const expansionRatio = ((decompressedText.length / textToDecompress.length) * 100).toFixed(1);
        await showToast({
          style: Toast.Style.Success,
          title: "Text decompressed",
          message: `Decompressed ${textToDecompress.length} → ${decompressedText.length} chars (${expansionRatio}% expansion).`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        setError(errorMessage);
        setIsLoading(false);
      }
    }

    performDecompression();
  }, []);

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Decompression Error\n\n${error}\n\n## Tips:\n- Make sure the input is valid base64 encoded Brotli compressed data\n- Check that the data was compressed using the same tool\n- Verify there are no extra characters or whitespace`}
        navigationTitle="Brotli Decompress"
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={content || "Decompressing..."}
      navigationTitle="Brotli Decompress"
      metadata={
        content && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text="✅ Decompressed successfully" />
            <Detail.Metadata.Label
              title="Content Type"
              text={
                content.includes("```json")
                  ? "JSON"
                  : content.includes("```javascript")
                    ? "JavaScript"
                    : content.includes("```html")
                      ? "HTML"
                      : content.includes("```xml")
                        ? "XML"
                        : "Plain Text"
              }
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Original Size" text={`${originalSize} characters`} />
            <Detail.Metadata.Label title="Decompressed Size" text={`${decompressedSize} characters`} />
            <Detail.Metadata.Label
              title="Expansion Ratio"
              text={`${((decompressedSize / originalSize) * 100).toFixed(1)}%`}
            />
          </Detail.Metadata>
        )
      }
    />
  );
}
