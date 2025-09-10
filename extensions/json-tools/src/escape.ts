import { getInputText, setOutputText, showError } from "./utils";

export default async function main() {
  try {
    const inputText = await getInputText();

    if (!inputText.trim()) {
      await showError("No text found in selection or clipboard");
      return;
    }

    const parsedJson = JSON.parse(inputText);
    const escapedString = JSON.stringify(JSON.stringify(parsedJson));

    await setOutputText(escapedString);
  } catch (error) {
    if (error instanceof SyntaxError) {
      await showError("Invalid JSON format");
    } else {
      await showError("Failed to parse JSON");
    }
  }
}
