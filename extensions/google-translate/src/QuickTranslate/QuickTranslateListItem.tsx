import React from "react";
import { ActionPanel, List } from "@raycast/api";
import { supportedLanguagesByCode } from "../languages";
import { SimpleTranslateResult } from "../simple-translate";
import { ConfigurableCopyPasteActions, OpenOnGoogleTranslateWebsiteAction, ToggleFullTextAction } from "../actions";

export function QuickTranslateListItem(props: {
  debouncedText: string;
  result: SimpleTranslateResult;
  isShowingDetail: boolean;
  setIsShowingDetail: (isShowingDetail: boolean) => void;
  originalSourceLanguage: string;
}) {
  const langFrom = supportedLanguagesByCode[props.result.langFrom];
  const langTo = supportedLanguagesByCode[props.result.langTo];

  const pronunciationMarkdown = props.result.pronunciationText
    ? `\`\`\`\n${props.result.pronunciationText}\n\`\`\`\n\n`
    : "";

  return (
    <List.Item
      title={props.result.translatedText}
      accessories={[
        {
          text: langTo.name,
          tooltip: `${langFrom.name} -> ${langTo.name}`,
        },
      ]}
      detail={
        <List.Item.Detail
          markdown={props.result.translatedText + "\n\n\n" + pronunciationMarkdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Source Language">
                {props.originalSourceLanguage === "auto" && (
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
            <ConfigurableCopyPasteActions defaultActionsPrefix="Translation" value={props.result.translatedText} />
            <ToggleFullTextAction onAction={() => props.setIsShowingDetail(!props.isShowingDetail)} />
            <OpenOnGoogleTranslateWebsiteAction translationText={props.debouncedText} translation={props.result} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
