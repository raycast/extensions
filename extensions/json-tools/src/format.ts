import { getInputText, setOutputText, showError } from "./utils";

export default async function main() {
  try {
    const inputText = await getInputText();

    if (!inputText.trim()) {
      await showError("No text found in selection or clipboard");
      return;
    }

    const parsedJson = JSON.parse(inputText);
    const formattedJson = JSON.stringify(parsedJson, null, 2);

    await setOutputText(formattedJson);
  } catch (error) {
    if (error instanceof SyntaxError) {
      await showError("Invalid JSON format");
    } else {
      await showError("Failed to format JSON");
    }
  }
}
