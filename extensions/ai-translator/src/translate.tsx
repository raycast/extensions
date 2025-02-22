import { showToast, List } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

const API_URL = "https://ai-translator-iota.vercel.app/api/chat";

// Define the interface for translation data
interface TranslationResult {
  translation: string;
  meaning: string;
  example_sentences: string[];
  similar_words: { word: string; translation: string; difference: string }[];
}

// Add this interface at the top with other type definitions
interface TranslationResponse {
  translations: TranslationResult[];
}

export default function TranslationSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [translationOutput, setTranslationOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hideNonEnglish, setHideNonEnglish] = useState(true);
  const [rawResponseData, setRawResponseData] = useState<TranslationResponse | null>(null);

  // Debounce the input: trigger translation 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() !== "") {
        fetchTranslation();
      } else {
        setTranslationOutput("");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Re-render translation when hideNonEnglish changes
  useEffect(() => {
    if (rawResponseData) {
      renderTranslation(rawResponseData);
    }
  }, [hideNonEnglish]);

  const fetchTranslation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: searchQuery }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }

      const data = (await response.json()) as {
        translations: {
          translation: string;
          meaning: string;
          example_sentences: string[];
          similar_words: { word: string; translation: string; difference: string }[];
        }[];
      };

      setRawResponseData(data);
      renderTranslation(data);
      showToast({ title: "Success", message: "Translation fetched successfully!" });
    } catch (error) {
      showToast({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to fetch translation",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderTranslation = (data: { translations: TranslationResult[] }) => {
    const formattedTranslation = data.translations
      .map((translationData: TranslationResult, index: number) => {
        const isEnglishTranslation = /^[a-zA-Z\s]*$/.test(translationData.translation);

        const filteredSimilarWords = translationData.similar_words
          .map((similarWord, i) => {
            const isEnglishSimilarWord = /^[a-zA-Z\s]*$/.test(similarWord.translation);
            return `
- **Similar Word ${i + 1}**
  - **Word**: ${similarWord.word}
  ${hideNonEnglish && !isEnglishSimilarWord ? "" : `  - **Translation**: ${similarWord.translation}`}
  - **Difference**: ${similarWord.difference}
`;
          })
          .join("\n");

        // Construct the translation block
        const translationBlock = `
${hideNonEnglish && !isEnglishTranslation ? "" : `### Translation ${index + 1}`}
${hideNonEnglish && !isEnglishTranslation ? "" : translationData.translation}

### Meaning
${translationData.meaning}

### Example Sentences
${translationData.example_sentences.map((sentence: string) => `- ${sentence}`).join("\n")}

### Similar Words
${filteredSimilarWords}
        `;

        return translationBlock.trim() ? translationBlock : null;
      })
      .filter(Boolean) // Ensure null values are removed
      .join("\n\n");

    setTranslationOutput(formattedTranslation);
  };

  const languageFilterOptions = [
    { id: "hide", name: "Hide Non-English Translations" },
    { id: "show", name: "Show All Translations" },
  ];
  const onLanguageFilterChange = (newValue: string) => {
    setHideNonEnglish(newValue === "hide");
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchQuery}
      searchBarPlaceholder="Enter a word or select text..."
      searchBarAccessory={
        <LanguageFilterDropdown
          languageFilterOptions={languageFilterOptions}
          onLanguageFilterChange={onLanguageFilterChange}
        />
      }
      throttle
      isShowingDetail={true}
    >
      <List.Item
        title={searchQuery || "No input provided"}
        detail={<List.Item.Detail markdown={translationOutput || "Enter a word to translate."} />}
      />
    </List>
  );
}

function LanguageFilterDropdown(props: {
  languageFilterOptions: { id: string; name: string }[];
  onLanguageFilterChange: (newValue: string) => void;
}) {
  const { languageFilterOptions, onLanguageFilterChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Hide Non-English"
      storeValue={true}
      onChange={(newValue) => {
        onLanguageFilterChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Hide Non-English">
        {languageFilterOptions.map((languageFilterOption) => (
          <List.Dropdown.Item
            key={languageFilterOption.id}
            title={languageFilterOption.name}
            value={languageFilterOption.id}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
