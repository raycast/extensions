import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getLanguageFlag, supportedLanguagesByCode } from "../languages";
import { simpleTranslate } from "../simple-translate";
import { LanguageCodeSet } from "../types";

export function QuickTranslateListItem(props: {
  debouncedText: string;
  languageSet: LanguageCodeSet;
  isShowingDetail: boolean;
  setIsShowingDetail: (isShowingDetail: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
}) {
  let langFrom = supportedLanguagesByCode[props.languageSet.langFrom];
  const langTo = supportedLanguagesByCode[props.languageSet.langTo];

  const { data: result, isLoading: isLoading } = usePromise(simpleTranslate, [props.debouncedText, props.languageSet], {
    onWillExecute() {
      props.setIsLoading(true);
    },
    onData() {
      props.setIsLoading(false);
    },
    onError(error) {
      props.setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: `Could not translate to ${langTo.name}`,
        message: error.toString(),
      });
    },
  });

  if (isLoading) {
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

  if (!result) {
    return null;
  }

  // Reassigning langFrom to the detected language in case it was auto-detected
  langFrom = supportedLanguagesByCode[result.langFrom];

  return (
    <List.Item
      key={langTo.code}
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
