import { List, getPreferenceValues, ActionPanel, showToast, Toast, Action, Icon } from "@raycast/api";
import { ReactElement, useEffect, useState } from "react";
import translate from "@vitalets/google-translate-api";
import { supportedLanguagesByCode, LanguageCode } from "./languages";

let count = 0;

export default function Command(): ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [toTranslate, setToTranslate] = useState("");
  const [results, setResults] = useState<
    { text: string; languages: string; source_language: string; target_language: string }[]
  >([]);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  useEffect(() => {
    if (toTranslate === "") {
      return;
    }

    count++;
    const localCount = count;

    setIsLoading(true);
    setResults([]);

    const preferences = getPreferenceValues<{
      lang1: LanguageCode;
      lang2: LanguageCode;
    }>();

    const promises = Promise.all([
      translate(toTranslate, {
        from: preferences.lang1,
        to: preferences.lang2,
      }),
      translate(toTranslate, {
        from: preferences.lang2,
        to: preferences.lang1,
      }),
    ]);

    promises
      .then((res) => {
        if (localCount === count) {
          const lang1Rep =
            supportedLanguagesByCode[preferences.lang1].flag ?? supportedLanguagesByCode[preferences.lang1].code;
          const lang2Rep =
            supportedLanguagesByCode[preferences.lang2].flag ?? supportedLanguagesByCode[preferences.lang2].code;
          setResults([
            {
              text: res[0].text,
              languages: `${lang1Rep} -> ${lang2Rep}`,
              source_language: supportedLanguagesByCode[preferences.lang1].code,
              target_language: supportedLanguagesByCode[preferences.lang2].code,
            },
            {
              text: res[1].text,
              languages: `${lang2Rep} -> ${lang1Rep}`,
              source_language: supportedLanguagesByCode[preferences.lang2].code,
              target_language: supportedLanguagesByCode[preferences.lang1].code,
            },
          ]);
        }
      })
      .catch((errors) => {
        showToast(Toast.Style.Failure, "Could not translate", errors);
      })
      .then(() => {
        setIsLoading(false);
      });
  }, [toTranslate]);

  return (
    <List
      searchBarPlaceholder="Enter text to translate"
      onSearchTextChange={setToTranslate}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      throttle
    >
      {results.map((r, index) => (
        <List.Item
          key={index}
          title={r.text}
          accessoryTitle={r.languages}
          detail={<List.Item.Detail markdown={r.text} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy" content={r.text} />
                <Action
                  title="Toggle Full Text"
                  icon={Icon.Text}
                  onAction={() => setIsShowingDetail(!isShowingDetail)}
                />
                <Action.OpenInBrowser
                  title="Open in Google Translate"
                  shortcut={{ modifiers: ["opt"], key: "enter" }}
                  url={
                    "https://translate.google.com/?sl=" +
                    r.source_language +
                    "&tl=" +
                    r.target_language +
                    "&text=" +
                    encodeURIComponent(toTranslate) +
                    "&op=translate"
                  }
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
