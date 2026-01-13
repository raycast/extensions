import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";

interface Preferences {
  apiKey: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const apiKey = preferences.apiKey;

    if (!apiKey) {
      await showHUD("❌ Add your Struk API key in preferences");
      return;
    }

    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("❌ No text in clipboard");
      return;
    }

    await showHUD("⏳ Merging and structuring...");

    const response = await fetch(
      "https://struk-backend.onrender.com/api/convert",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text: clipboardText,
          workflow: "merge_structure",
          template: "dense",
          format: "plain",
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        await showHUD(
          "❌ Daily limit reached. Upgrade to Pro at struk.ai/pricing",
        );
      } else {
        await showHUD(`❌ ${data.error || "Failed"}`);
      }
      return;
    }

    const formattedText = data.output || data.formatted_text || data.text;
    const plainText = stripHtml(formattedText);
    await Clipboard.copy(plainText);
    await showHUD("✅ Content merged!");
  } catch (error) {
    await showHUD("❌ Something went wrong");
    console.error(error);
  }
}
