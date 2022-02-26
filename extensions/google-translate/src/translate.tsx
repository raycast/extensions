import { List, getPreferenceValues, ActionPanel, CopyToClipboardAction, showToast, ToastStyle } from "@raycast/api";
import { ReactElement, useEffect, useState } from "react";
import translate from "@vitalets/google-translate-api";
import supportedLanguagesByCode from "./supportedLanguagesByCode.json";

let count = 0;

export default function Command(): ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [toTranslate, setToTranslate] = useState("");
  const [results, setResults] = useState<{ text: string; languages: string }[]>([]);

  useEffect(() => {
    if (toTranslate === "") {
      return;
    }

    count++;
    const localCount = count;

    setIsLoading(true);
    setResults([]);

    const preferences = getPreferenceValues();

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
            (supportedLanguagesByCode as any)[preferences.lang1].flag ??
            (supportedLanguagesByCode as any)[preferences.lang1].code;
          const lang2Rep =
            (supportedLanguagesByCode as any)[preferences.lang2].flag ??
            (supportedLanguagesByCode as any)[preferences.lang2].code;
          setResults([
            {
              text: res[0].text,
              languages: `${lang1Rep} -> ${lang2Rep}`,
            },
            {
              text: res[1].text,
              languages: `${lang2Rep} -> ${lang1Rep}`,
            },
          ]);
        }
      })
      .catch((errors) => {
        showToast(ToastStyle.Failure, "Could not translate", errors);
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
      throttle
    >
      {results.map((r, index) => (
        <List.Item
          key={index}
          title={r.text}
          accessoryTitle={r.languages}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <CopyToClipboardAction title="Copy" content={r.text} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
