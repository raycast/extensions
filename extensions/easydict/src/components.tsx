import { Component, useState } from "react";
import { exec, execFile } from "child_process";
import { languageItemList, SectionType, TranslationType } from "./consts";
import {
  ListItemActionPanelItem,
  YoudaoTranslateReformatResultItem,
} from "./types";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { getGoogleTranslateURL, myPreferences, truncate } from "./utils";

export const eudicBundleId = "com.eusoft.freeeudic";

export function playSoundIcon(lightTintColor: string) {
  return {
    source: { light: "speak.png", dark: "speak.png" },
    tintColor: { light: lightTintColor, dark: "lightgray" },
  };
}

// function: Returns the corresponding ImageLike based on the SectionType type
export function getListItemIcon(
  sectionType: SectionType | TranslationType
): Image.ImageLike {
  let dotColor: Color.ColorLike = Color.PrimaryText;
  switch (sectionType) {
    case TranslationType.Youdao: {
      dotColor = Color.Red;
      break;
    }
    case TranslationType.Baidu: {
      dotColor = "#4169E1";
      break;
    }
    case TranslationType.Caiyun: {
      dotColor = Color.Green;
      break;
    }

    case SectionType.Translation: {
      dotColor = Color.Red;
      break;
    }
    case SectionType.Explanations: {
      dotColor = Color.Blue;
      break;
    }
    case SectionType.WebTranslation: {
      dotColor = Color.Yellow;
      break;
    }
    case SectionType.WebPhrase: {
      dotColor = "teal";
      break;
    }
  }

  let itemIcon: Image.ImageLike = {
    source: Icon.Dot,
    tintColor: dotColor,
  };
  if (sectionType === SectionType.Forms) {
    itemIcon = Icon.Text;
  }
  return itemIcon;
}

// function: return List.Item.Accessory[] based on the SectionType type
export function getWordAccessories(
  sectionType: SectionType | TranslationType,
  item: YoudaoTranslateReformatResultItem
): List.Item.Accessory[] {
  let wordExamTypeAccessory = [];
  let pronunciationAccessory = [];
  let wordAccessories: any[] = [];
  if (sectionType === SectionType.Translation) {
    if (item.examTypes) {
      wordExamTypeAccessory = [
        {
          icon: { source: Icon.Star, tintColor: Color.SecondaryText },
          tooltip: "Word included in the types of exam",
        },
        { text: item.examTypes?.join("  ") },
      ];
      wordAccessories = [...wordExamTypeAccessory];
    }
    if (item.phonetic) {
      pronunciationAccessory = [
        {
          icon: playSoundIcon("gray"),
          tooltip: "Pronunciation",
        },
        { text: item.phonetic },
      ];
      wordAccessories = [
        ...wordAccessories,
        { text: " " },
        ...pronunciationAccessory,
      ];
    }
  }
  return wordAccessories;
}

export function ActionFeedback() {
  return (
    <Action.OpenInBrowser
      icon={Icon.QuestionMark}
      title="Feedback"
      url="https://github.com/raycast/extensions/issues"
    />
  );
}

export class ListActionPanel extends Component<ListItemActionPanelItem> {
  onPlaySound(text?: string, language?: string) {
    if (language && text) {
      const voiceIndex = 0;
      for (const LANG of languageItemList) {
        if (language === LANG.youdaoLanguageId) {
          const truncateText = truncate(text).replace(/"/g, " ");
          const sayCommand = `say -v ${LANG.languageVoice[voiceIndex]} '${truncateText}'`;
          console.log(sayCommand);
          LANG.languageVoice.length > 0 && exec(sayCommand);
        }
      }
    }
  }

  openInEudic = (queryText?: string) => {
    const url = `eudic://dict/${queryText}`;
    execFile("open", [url], (error, stdout, stderr) => {
      if (error) {
        console.log("error:", error);
        LocalStorage.removeItem(eudicBundleId);

        showToast({
          title: "Eudic is not installed.",
          style: Toast.Style.Failure,
        });
      }
      console.log(stdout);
    });
  };

  render() {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.CopyToClipboard
            onCopy={() => {
              console.log("copy: ", this.props.copyText);
            }}
            title={`Copy Text:  ${this.props.copyText}`}
            content={this.props.copyText || ""}
          />
          {this.props.isInstalledEudic && (
            <Action
              icon={Icon.MagnifyingGlass}
              title="Open in Eudic"
              onAction={() => this.openInEudic(this.props.queryText)}
            />
          )}
        </ActionPanel.Section>

        <ActionPanel.Section title="Search Query Text Online">
          {this.props.isShowOpenInEudicWeb && (
            <Action.OpenInBrowser
              icon={Icon.Link}
              title="See Eudic Translate Results"
              url={this.props.eudicWebUrl}
            />
          )}
          {this.props.isShowOpenInYoudaoWeb && (
            <Action.OpenInBrowser
              icon={Icon.Link}
              title="See Youdao Translate Results"
              url={this.props.youdaoWebUrl}
            />
          )}

          <Action.OpenInBrowser
            icon={Icon.Link}
            title="See Google Translate Results"
            url={getGoogleTranslateURL(
              this.props.queryText!,
              this.props.currentFromLanguage!,
              this.props.currentTargetLanguage!
            )}
          />
        </ActionPanel.Section>

        <ActionPanel.Section title="Play Sound">
          <Action
            title="Play Query Text Sound"
            icon={playSoundIcon("black")}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={() =>
              this.onPlaySound(
                this.props?.queryText,
                this.props.currentFromLanguage?.youdaoLanguageId
              )
            }
          />
          <Action
            title="Play Result Text Sound"
            icon={playSoundIcon("black")}
            onAction={() =>
              this.onPlaySound(
                this.props.copyText,
                this.props.currentTargetLanguage?.youdaoLanguageId
              )
            }
          />
        </ActionPanel.Section>

        {myPreferences.isDisplayTargetTranslationLanguage && (
          <ActionPanel.Section title="Target Language">
            {languageItemList.map((region) => {
              if (
                this.props.currentFromLanguage?.youdaoLanguageId ===
                region.youdaoLanguageId
              )
                return null;

              return (
                <Action
                  key={region.youdaoLanguageId}
                  title={region.languageTitle}
                  onAction={() => this.props.onLanguageUpdate(region)}
                  icon={
                    this.props.currentTargetLanguage?.youdaoLanguageId ===
                    region.youdaoLanguageId
                      ? Icon.ArrowRight
                      : Icon.Globe
                  }
                />
              );
            })}
          </ActionPanel.Section>
        )}

        <ActionPanel.Section>
          <ActionFeedback />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }
}
