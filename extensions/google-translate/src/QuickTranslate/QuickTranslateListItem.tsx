import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getLanguageFlag, supportedLanguagesByCode } from "../languages";
import { SimpleTranslateResult } from "../simple-translate";
import { LanguageCodeSet } from "../types";

export function QuickTranslateListItem(props: {
  debouncedText: string;
  languageSet: LanguageCodeSet;
  isShowingDetail: boolean;
  setIsShowingDetail: (isShowingDetail: boolean) => void;
  result: SimpleTranslateResult | undefined;
  isLoading: boolean;
}) {
  let langFrom = supportedLanguagesByCode[props.languageSet.langFrom];
  const langTo = supportedLanguagesByCode[props.languageSet.langTo];

  if (props.isLoading) {
    return (
      <List.Item
        title={`Translating to ${langTo.name}...`}
        accessories={[
          {
            text: `${getLanguageFlag(langTo, langTo?.code)}`,
            tooltip: `${langFrom.name} -> ${langTo.name}`,
          },
        ]}
      />
    );
  }

  const result = props.result;

  if (!result) {
    return null;
  }

  // Reassigning langFrom to the detected language in case it was auto-detected
  langFrom = supportedLanguagesByCode[result.langFrom];

  return (
    <List.Item
      title={result.translatedText}
      accessories={[
        {
          text: `${getLanguageFlag(langTo, langTo?.code)}`,
          tooltip: `${langFrom.name} -> ${langTo.name}`,
        },
      ]}
      detail={<List.Item.Detail markdown={result.translatedText} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy" content={result.translatedText} />
            <Action
              title="Toggle Full Text"
              icon={Icon.Text}
              onAction={() => props.setIsShowingDetail(!props.isShowingDetail)}
            />
            <Action.OpenInBrowser
              title="Open in Google Translate"
              shortcut={{ modifiers: ["opt"], key: "enter" }}
              url={
                "https://translate.google.com/?sl=" +
                result.langFrom +
                "&tl=" +
                result.langTo +
                "&text=" +
                encodeURIComponent(props.debouncedText) +
                "&op=translate"
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
