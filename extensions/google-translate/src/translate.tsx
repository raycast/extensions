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

export default function Translate(): ReactElement {
  const [selectedLanguageSet] = useSelectedLanguagesSet();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const [text, setText] = React.useState("");
  const debouncedValue = useDebouncedValue(text, 500);
  const { data: results, isLoading: isLoading } = usePromise(translateText, [debouncedValue, selectedLanguageSet], {
    onError(error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not translate",
        message: error.toString(),
      });
    },
  });

  return (
    <List
      searchBarPlaceholder="Enter text to translate"
      onSearchTextChange={setText}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={<LanguageManagerListDropdown />}
    >
      {results?.map((r, index) => {
        const langFrom = supportedLanguagesByCode[r.langFrom];
        const langTo = supportedLanguagesByCode[r.langTo];
        const languages = `${langFrom.flag ?? langFrom.code} -> ${langTo.flag ?? langTo.code}`;

        return (
          <List.Item
            key={index}
            title={r.translatedText}
            accessories={[{ text: languages }]}
            detail={<List.Item.Detail markdown={r.translatedText} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy" content={r.translatedText} />
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
                      r.langFrom +
                      "&tl=" +
                      r.langTo +
                      "&text=" +
                      encodeURIComponent(debouncedValue) +
                      "&op=translate"
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
