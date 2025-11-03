import { Form, ActionPanel, Action, showToast, Toast, List, useNavigation } from "@raycast/api";

const LANGUAGES = [
  { code: "bg", name: "Bulgarian", flag: "🇧🇬" },
  { code: "cs", name: "Czech", flag: "🇨🇿" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "el", name: "Greek", flag: "🇬🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "et", name: "Estonian", flag: "🇪🇪" },
  { code: "fi", name: "Finnish", flag: "🇫🇮" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "hu", name: "Hungarian", flag: "🇭🇺" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "lt", name: "Lithuanian", flag: "🇱🇹" },
  { code: "lv", name: "Latvian", flag: "🇱🇻" },
  { code: "mt", name: "Maltese", flag: "🇲🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "ro", name: "Romanian", flag: "🇷🇴" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "sk", name: "Slovak", flag: "🇸🇰" },
  { code: "sl", name: "Slovenian", flag: "🇸🇮" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
] as const;

interface Translation {
  text: string;
  translations: {
    text: string;
    examples: {
      src: string;
      dst: string;
    }[];
  }[];
}

type FormValues = {
  textarea: string;
  sourceLanguage: string;
  targetLanguage: string;
};

async function fetchTranslation(
  originalText: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<Translation[]> {
  try {
    const url = `https://linguee-api.fly.dev/api/v2/translations?query=${encodeURIComponent(originalText)}&src=${sourceLanguage}&dst=${targetLanguage}&guess_direction=false&follow_corrections=always`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const translations: Translation[] = (await response.json()) as Translation[];
    return translations;
  } catch (error) {
    console.error("Error fetching translated text:", error);
    throw error;
  }
}

function TranslationResultView({ translation }: { translation: Translation }) {
  return (
    <List>
      <List.Item title="Original text" subtitle={translation.text} />
      {translation.translations.map((t, index) => (
        <List.Item key={index} title={t.text} accessories={[{ text: `${t.examples.length} examples` }]} />
      ))}
    </List>
  );
}

export default function Command() {
  const { push } = useNavigation();

  async function handleSubmit(values: FormValues) {
    try {
      await showToast({ title: "Translating...", style: Toast.Style.Animated });

      const translations = await fetchTranslation(values.textarea, values.sourceLanguage, values.targetLanguage);

      if (translations && translations.length > 0) {
        push(<TranslationResultView translation={translations[0]} />);

        await showToast({
          style: Toast.Style.Success,
          title: "Translation complete",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: `No translation found for text: ${values.textarea}`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Translation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="This command allows you to translate text into different languages. Select the source and target language below." />
      <Form.Dropdown id="sourceLanguage" title="Source language" defaultValue="en">
        {LANGUAGES.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={lang.flag} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="targetLanguage" title="Target language" defaultValue="en">
        {LANGUAGES.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={lang.flag} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="textarea"
        title="Text area"
        placeholder="Enter the text you wish to translate to the target language."
      />
    </Form>
  );
}
