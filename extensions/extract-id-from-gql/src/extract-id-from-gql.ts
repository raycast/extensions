import { Clipboard, showHUD } from "@raycast/api";
import { entrypoint } from "./lib/utils";

interface ParsedEntity {
  version: number;
  type: string;
  id: string;
}

export default entrypoint(async () => {
  try {
    // Get clipboard contents
    const clipboardText = await Clipboard.readText();
    
    if (!clipboardText) {
      await showHUD("❌ Clipboard is empty");
      return;
    }

    // Try to decode Base64
    let decodedText: string;
    try {
      decodedText = Buffer.from(clipboardText, 'base64').toString('utf-8');
    } catch (error) {
      await showHUD("❌ Invalid Base64 content");
      return;
    }

    // Parse the decoded text
    const parsedEntity = parseEntityString(decodedText);
    
    if (!parsedEntity) {
      await showHUD("❌ Invalid entity format");
      return;
    }

    // Copy the ID back to clipboard
    await Clipboard.copy(parsedEntity.id);
    await showHUD(`✅ Extracted ID: ${parsedEntity.id}`);

  } catch (error) {
    await showHUD("❌ Error processing clipboard content");
    console.error(error);
  }
});

function parseEntityString(input: string): ParsedEntity | null {
  // Expected format: "1:Entity:abc"
  const parts = input.split(':');
  
  if (parts.length !== 3) {
    return null;
  }

  const version = parseInt(parts[0], 10);
  if (isNaN(version)) {
    return null;
  }

  return {
    version: version,
    type: parts[1],
    id: parts[2]
  };
}