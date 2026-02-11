import { showToast, Toast, getPreferenceValues, AI, BrowserExtension } from "@raycast/api";
import { marked } from "marked";
import fetch from "node-fetch";

async function saveToReader(html: string, title: string, url: string) {
  const { readwiseToken } = getPreferenceValues();

  try {
    const response = await fetch("https://readwise.io/api/v3/save/", {
      method: "POST",
      headers: {
        Authorization: `Token ${readwiseToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        html: html,
        title,
        should_clean_html: true,
        location: "later",
        category: "article",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Request failed: ${response.status} ${response.statusText}\n${errorData}`);
    }
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

async function translateToLanguage(text: string, language: string): Promise<string> {
  const prompt = `You are a professional translator proficient in ${language}. Your task is to translate the following content into ${language} without any explanations, just the translation as requested.
The translation should be idiomatic, aiming for accuracy, fluency, and elegance, but still retaining specific terms or media names (if any). The text should be more accessible and conform to the expression habits of ${language} while adhering to the original meaning.
Please retain the markdown format from the original text.
If the content is a script for a podcast or video, remove any timestamps and YouTube timestamp links that may exist.
If the content contains acronyms, names of people, places, product names, etc., please keep these names in their original form.\n\n${text}`;
  return await AI.ask(prompt, { model: AI.Model["OpenAI_GPT4o-mini"] });
}

export default async function Command() {
  try {
    const { autoTranslate, targetLanguage } = getPreferenceValues();
    const content = await BrowserExtension.getContent({ format: "markdown" });
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);
    const url = activeTab?.url || "";
    const title = activeTab?.title || "";

    await showToast(Toast.Style.Animated, "Processing...");

    let finalContent = content;
    if (autoTranslate) {
      finalContent = await translateToLanguage(content, targetLanguage);
    }
    const html = await marked(finalContent);

    await saveToReader(html, title, url);

    await showToast(Toast.Style.Success, "Successfully saved to Reader");
  } catch (e) {
    await showToast(Toast.Style.Failure, "Save failed", String(e));
  }
}
