import { Clipboard, showToast, Toast, getSelectedText, List, Action, ActionPanel, Icon } from "@raycast/api";
import { useState, useEffect } from "react";

interface Language {
  code: string;
  name: string;
}

const LANGUAGES: Language[] = [
  { code: "es", name: "Spanish" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "zh-Hans", name: "Chinese (Simplified)" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "it", name: "Italian" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
];

async function getAuthToken(): Promise<string> {
  const tokenResponse = await fetch("https://edge.microsoft.com/translate/auth", {
    method: "GET",
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to get authentication token");
  }

  return await tokenResponse.text();
}

async function translateText(text: string, targetLang: string, authToken: string): Promise<string> {
  const response = await fetch(
    `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=${targetLang}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify([{ Text: text }]),
    },
  );

  if (!response.ok) {
    throw new Error(`Translation failed`);
  }

  const data = (await response.json()) as { translations: { text: string }[] }[];
  return data[0].translations[0].text;
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

async function translateJson(jsonObj: JsonValue, targetLang: string, authToken: string): Promise<JsonValue> {
  if (typeof jsonObj === "string") {
    return await translateText(jsonObj, targetLang, authToken);
  } else if (Array.isArray(jsonObj)) {
    return await Promise.all(jsonObj.map((item) => translateJson(item, targetLang, authToken)));
  } else if (typeof jsonObj === "object" && jsonObj !== null) {
    const result: { [key: string]: JsonValue } = {};
    for (const [key, value] of Object.entries(jsonObj)) {
      result[key] = await translateJson(value, targetLang, authToken);
    }
    return result;
  }
  return jsonObj;
}

function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export default function Command() {
  const [selectedText, setSelectedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSelectedText()
      .then((text) => {
        setSelectedText(text);
        setIsLoading(false);
      })
      .catch(() => {
        showToast({
          style: Toast.Style.Failure,
          title: "No text selected",
          message: "Please select some text first",
        });
        setIsLoading(false);
      });
  }, []);

  async function handleTranslate(language: Language) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Translating to ${language.name}...`,
    });

    try {
      const authToken = await getAuthToken();
      let result: string;

      if (isValidJson(selectedText)) {
        // Translate JSON values only (preserving keys)
        const jsonObj = JSON.parse(selectedText);
        const translated = await translateJson(jsonObj, language.code, authToken);
        result = JSON.stringify(translated, null, 2);
      } else {
        // Translate full text
        result = await translateText(selectedText, language.code, authToken);
      }

      await Clipboard.copy(result);
      await Clipboard.paste(result);

      toast.style = Toast.Style.Success;
      toast.title = `Translated to ${language.name}`;
      toast.message = "Result copied and pasted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Translation failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select target language">
      {LANGUAGES.map((language) => (
        <List.Item
          key={language.code}
          icon={Icon.Globe}
          title={language.name}
          subtitle={language.code}
          actions={
            <ActionPanel>
              <Action title="Translate" onAction={() => handleTranslate(language)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
