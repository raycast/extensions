import { getInputText, setOutputText, showError } from "./utils";

export default async function main() {
  try {
    const inputText = await getInputText();

    if (!inputText.trim()) {
      await showError("No text found in selection or clipboard");
      return;
    }

    const unescapedString = JSON.parse(inputText);

    if (typeof unescapedString !== "string") {
      await showError("Input must be a JSON string literal");
      return;
    }

    await setOutputText(unescapedString);
  } catch (error) {
    if (error instanceof SyntaxError) {
      await showError("Invalid string literal format");
    } else {
      await showError("Failed to unparse string");
    }
  }
}
