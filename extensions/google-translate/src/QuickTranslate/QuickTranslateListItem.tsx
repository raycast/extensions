import { ActionPanel, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { supportedLanguagesByCode } from "../languages";
import { simpleTranslate } from "../simple-translate";
import { LanguageCodeSet } from "../types";
import { ConfigurableCopyPasteActions, OpenOnGoogleTranslateWebsiteAction, ToggleFullTextAction } from "../actions";

export function QuickTranslateListItem(props: {
  debouncedText: string;
  languageSet: LanguageCodeSet;
  isShowingDetail: boolean;
  setIsShowingDetail: (isShowingDetail: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
}) {
  let langFrom = supportedLanguagesByCode[props.languageSet.langFrom];
  const langTo = supportedLanguagesByCode[props.languageSet.langTo[0]];

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
            text: langTo.name,
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
          text: langTo.name,
          tooltip: `${langFrom.name} -> ${langTo.name}`,
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={result.translatedText}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Source Language">
                {props.languageSet.langFrom === "auto" && (
                  <List.Item.Detail.Metadata.TagList.Item text={supportedLanguagesByCode.auto.name} color={"#FECD57"} />
                )}
                <List.Item.Detail.Metadata.TagList.Item text={langFrom.name} color={"#A0D468"} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Target Language">
                <List.Item.Detail.Metadata.TagList.Item text={langTo.name} color={"#B3A5EF"} />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ConfigurableCopyPasteActions defaultActionsPrefix="Translation" value={result.translatedText} />
            <ToggleFullTextAction onAction={() => props.setIsShowingDetail(!props.isShowingDetail)} />
            <OpenOnGoogleTranslateWebsiteAction translationText={props.debouncedText} translation={result} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
