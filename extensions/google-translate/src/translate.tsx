import React, { ReactElement, useState } from "react";
import { List, ActionPanel, showToast, Toast, Action, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useDebouncedValue, useSelectedLanguagesSet } from "./hooks";
import { supportedLanguagesByCode } from "./languages";
import { LanguageManagerListDropdown } from "./LanguagesManager";
import { AUTO_DETECT, simpleTranslate } from "./simple-translate";
import { LanguageCodeSet } from "./types";

async function translateText(text: string, opts: LanguageCodeSet) {
  if (!text) {
    return [];
  }

  if (opts.langFrom === AUTO_DETECT) {
    const translated1 = await simpleTranslate(text, {
      langFrom: opts.langFrom,
      langTo: opts.langTo,
    });

    if (translated1?.langFrom) {
      const translated2 = await simpleTranslate(translated1.translatedText, {
        langFrom: opts.langTo,
        langTo: translated1.langFrom,
      });

      return [translated1, translated2];
    }

    return [];
  } else {
    return await Promise.all([
      simpleTranslate(text, {
        langFrom: opts.langFrom,
        langTo: opts.langTo,
      }),
      simpleTranslate(text, {
        langFrom: opts.langTo,
        langTo: opts.langFrom,
      }),
    ]);
  }
}

export default function Command(): ReactElement {
  const [selectedLanguageSet] = useSelectedLanguagesSet();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const [text, setText] = React.useState("");
  const debouncedValue = useDebouncedValue(text, 500);
  const { data: results, isLoading: isLoading } = usePromise(
    async (...args: Parameters<typeof translateText>) => {
      const results = await translateText(...args);

      return results.map((t) => {
        const langFrom = supportedLanguagesByCode[t.langFrom];
        const langFromRep = langFrom.flag ?? langFrom.code;
        const langTo = supportedLanguagesByCode[t.langTo];
        const langToRep = langTo.flag ?? langTo.code;

        return {
          text: t.translatedText,
          languages: `${langFromRep} -> ${langToRep}`,
          sourceLanguage: supportedLanguagesByCode[t.langFrom]?.code,
          targetLanguage: supportedLanguagesByCode[t.langTo]?.code,
        };
      });
    },
    [debouncedValue, selectedLanguageSet],
    {
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not translate",
          message: error.toString(),
        });
      },
    }
  );

  return (
    <List
      searchBarPlaceholder="Enter text to translate"
      onSearchTextChange={setText}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={<LanguageManagerListDropdown />}
    >
      {results?.map((r, index) => (
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
                    r.sourceLanguage +
                    "&tl=" +
                    r.targetLanguage +
                    "&text=" +
                    encodeURIComponent(debouncedValue) +
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
