import { List, getPreferenceValues, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import fetch from "node-fetch";
import { LanguageDropdown } from "./components/LanguageDropdown";
import { languages } from "./constants/languages";
import { tones } from "./constants/tones";

type NeuroooResponse =
  | {
      target: string;
      source_language_code: string;
    }
  | { target: never; source_language_code: never; status: number; errors: string[] };

type Entry = {
  date: Date;
  id: string;
  sourceLanguage: string;
  sourceText: string;
  targetLanguage: string;
  targetText: string;
  tone: string;
};

export default function Command() {
  const preferences = getPreferenceValues();

  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<string>("");
  const [targetLanguage, setTargetLanguage] = useState<string>("en-US");
  const [tone, setTone] = useState("auto");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>();

  const translateText = async (
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
    tone: string = "auto",
  ) => {
    setIsLoading(true);

    const safeSourceLanguage = sourceLanguage && sourceLanguage.length > 0 ? sourceLanguage : undefined;

    const body = JSON.stringify({
      source: text,
      source_language_code: safeSourceLanguage,
      target_language_code: targetLanguage,
      tone: tone,
    });

    fetch("https://neurooo.com/api/v1/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": preferences.apiKey,
      },
      body,
    })
      .then((response) => response.json())
      .then(async (data) => {
        const dataResponse = data as NeuroooResponse;

        if ("errors" in dataResponse && dataResponse.status !== 200) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Something went wrong",
            message: dataResponse.errors.join(" "),
          });

          return;
        }

        const entry: Entry = {
          id: `entry-${nanoid()}`,
          date: new Date(),
          sourceLanguage: dataResponse.source_language_code,
          sourceText: searchText,
          targetLanguage,
          targetText: (data as NeuroooResponse).target,
          tone,
        };

        setEntries((entries) => [entry, ...entries]);
        setTimeout(() => {
          setSelectedItemId(entry.id);
        }, 100);
      })
      .catch((error) => {
        console.error(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Translation failed",
          message: "An error occurred while translating",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (searchText === "") {
      return;
    }

    translateText(searchText, targetLanguage, sourceLanguage, tone);
  }, [searchText, sourceLanguage, targetLanguage]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={entries.length > 0}
      navigationTitle={isLoading ? "Translating..." : "Ready"}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <LanguageDropdown tooltip="Select Language" value={targetLanguage} onChange={setTargetLanguage} />
      }
      searchBarPlaceholder="Type text to translate..."
      searchText={searchText}
      selectedItemId={selectedItemId}
      onSelectionChange={(value) => setSelectedItemId(value ?? undefined)}
      throttle={true}
    >
      {entries.map((entry) => (
        <List.Item
          key={entry.id}
          id={entry.id}
          title={entry.sourceText}
          detail={
            <List.Item.Detail
              markdown={entry.targetText}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Source Language"
                    text={entry.sourceLanguage !== "" ? entry.sourceLanguage : "Auto"}
                  />
                  <List.Item.Detail.Metadata.Label title="Target Language" text={entry.targetLanguage} />
                  <List.Item.Detail.Metadata.Label title="Tone" text={entry.tone} />
                  <List.Item.Detail.Metadata.Label title="Source Text" text={entry.sourceText} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          accessories={[{ text: entry.sourceLanguage }, { text: entry.tone }]}
          actions={
            <ActionPanel title={entry.sourceText}>
              <Action.CopyToClipboard title="Copy to Clipboard" content={entry.targetText} />
              <ActionPanel.Section title="Change Source Language">
                <Action
                  title={`From: Auto Detect`}
                  onAction={() => {
                    setSourceLanguage("");
                    translateText(entry.sourceText, entry.targetLanguage, "", entry.tone);
                  }}
                />
                {languages.map((language) => (
                  <Action
                    key={language.value}
                    title={`From: ${language.label}`}
                    onAction={() => {
                      setSourceLanguage(language.value);
                      translateText(entry.sourceText, entry.targetLanguage, language.value, entry.tone);
                    }}
                  />
                ))}
              </ActionPanel.Section>
              <ActionPanel.Section title="Change Target Language">
                {languages.map((language) => (
                  <Action
                    key={language.value}
                    title={`To: ${language.label}`}
                    onAction={() => {
                      setTargetLanguage(language.value);
                      translateText(entry.sourceText, language.value, entry.sourceLanguage, entry.tone);
                    }}
                  />
                ))}
              </ActionPanel.Section>
              <ActionPanel.Section title="Change Tone">
                {tones.map((tone) => (
                  <Action
                    key={tone.value}
                    title={tone.label}
                    onAction={() => {
                      setTone(tone.value);
                      translateText(entry.sourceText, entry.targetLanguage, entry.sourceLanguage, tone.value);
                    }}
                  />
                ))}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
