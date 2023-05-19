import { ReactElement, useEffect, useState } from "react";
import { List, ActionPanel, showToast, Toast, Action, Icon } from "@raycast/api";
import { useSelectedLanguagesSet } from "./hooks";
import { supportedLanguagesByCode, LanguageCode } from "./languages";
import { LanguageManagerListDropdown } from "./LanguagesManager";
import { AUTO_DETECT, simpleTranslate } from "./simple-translate";

let count = 0;

async function translateText(langFrom: LanguageCode, langTo: LanguageCode, text: string) {
  if (langFrom === AUTO_DETECT) {
    const translated1 = await simpleTranslate(text, {
      langFrom: langFrom,
      langTo: langTo,
    });

    if (translated1.langFrom) {
      const translated2 = await simpleTranslate(text, { langFrom: langTo, langTo: translated1.langFrom });
      return [translated1, translated2];
    }

    return [];
  } else {
    return await Promise.all([
      simpleTranslate(text, {
        langFrom: langFrom,
        langTo: langTo,
      }),
      simpleTranslate(text, {
        langFrom: langTo,
        langTo: langFrom,
      }),
    ]);
  }
}

export default function Command(): ReactElement {
  const [selectedLanguageSet] = useSelectedLanguagesSet();
  const [isLoading, setIsLoading] = useState(false);
  const [toTranslate, setToTranslate] = useState("");
  const [results, setResults] = useState<
    { text: string; languages: string; source_language: string; target_language: string }[]
  >([]);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (toTranslate === "") {
      setResults([]);
      return;
    }

    count++;
    const localCount = count;

    setIsLoading(true);

    translateText(selectedLanguageSet.langFrom, selectedLanguageSet.langTo, toTranslate)
      .then((translations) => {
        if (localCount === count) {
          if (selectedLanguageSet.langFrom === AUTO_DETECT && !translations.length) {
            showToast(Toast.Style.Failure, "Could not translate", "Could not detect language");
            setResults([]);
            setIsLoading(false);
            return;
          }

          const result = translations.map((t) => {
            const langFrom = supportedLanguagesByCode[t.langFrom];
            const langFromRep = langFrom.flag ?? langFrom.code;
            const langTo = supportedLanguagesByCode[t.langTo];
            const langToRep = langTo.flag ?? langTo.code;

            return {
              text: t.translatedText,
              languages: `${langFromRep} -> ${langToRep}`,
              source_language: supportedLanguagesByCode[t.langFrom]?.code,
              target_language: supportedLanguagesByCode[t.langTo]?.code,
            };
          });

          setResults(result);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error("translate error", error);
        // HACK: BAD_NETWORK errors are caused by too many requests in quick succession;
        // ignore and retry – this should be fixed systemically.
        if (error?.code === "BAD_NETWORK") {
          setRetryCount(retryCount + 1);
        } else {
          setIsLoading(false);
          showToast(Toast.Style.Failure, "Could not translate", error?.toString());
        }
      });
  }, [toTranslate, selectedLanguageSet.langFrom, selectedLanguageSet.langTo, retryCount]);

  return (
    <List
      searchBarPlaceholder="Enter text to translate"
      onSearchTextChange={setToTranslate}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      throttle
      searchBarAccessory={<LanguageManagerListDropdown />}
    >
      {results.map((r, index) => (
        <List.Item
          key={index}
          title={r.text}
          accessories={[{ text: r.languages }]}
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
