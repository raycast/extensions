/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-04 18:19
 * @fileName: components.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { languageItemList, SectionType, TranslateType } from "./consts";
import { ActionListPanelProps, YoudaoTranslateReformatResultItem } from "./types";
import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import {
  checkIsInstalledEudic,
  getEudicWebTranslateURL,
  getGoogleWebTranslateURL,
  getYoudaoWebTranslateURL,
  myPreferences,
} from "./utils";
import { sayTruncateCommand } from "./audio";
import { openInEudic } from "./scripts";
import { playYoudaoWordAudioAfterDownloading } from "./dict/youdao/request";
import { ReleaseDetail } from "./releaseVersion/releaseDetail";
import { useState } from "react";
import { Easydict } from "./releaseVersion/versionInfo";

export const eudicBundleId = "com.eusoft.freeeudic";

export function ActionFeedback() {
  const easydict = new Easydict();
  return <Action.OpenInBrowser icon={Icon.QuestionMark} title="Feedback" url={easydict.getIssueUrl()} />;
}

export function ActionRecentUpdate(props: { title?: string }) {
  return <Action.Push icon={Icon.Sidebar} title={props.title || "Recent Update ✨"} target={<ReleaseDetail />} />;
}

export function ActionCurrentVersion() {
  const easydict = new Easydict();
  return (
    <Action.OpenInBrowser
      icon={Icon.Globe}
      title={`Version: ${easydict.version}`}
      url={easydict.getCurrentReleaseTagUrl()}
    />
  );
}

/**
 * Get the list action panel item with ListItemActionPanelItem
 */
export default function ListActionPanel(props: ActionListPanelProps) {
  const currentEasydict = new Easydict();

  const [hasPrompted, setHasPrompted] = useState(false);
  // const [easydict, setEasydict] = useState<Easydict>();
  const [isInstalledEudic, setIsInstalledEudic] = useState<boolean>(false);

  checkIsInstalledEudic(setIsInstalledEudic);

  currentEasydict.getCurrentVersionInfo().then((easydict) => {
    console.log(`has prompted: ${easydict.hasPrompted}`);
    setHasPrompted(easydict.hasPrompted);
  });

  const eudicWebUrl = getEudicWebTranslateURL(props.displayItem.queryWordInfo);
  const youdaoWebUrl = getYoudaoWebTranslateURL(props.displayItem.queryWordInfo);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!hasPrompted && <ActionRecentUpdate title="✨ New Version Released" />}

        {isInstalledEudic && (
          <Action
            icon={Icon.MagnifyingGlass}
            title="Open in Eudic"
            onAction={() => openInEudic(props.displayItem.queryWordInfo.word)}
          />
        )}
        <Action.CopyToClipboard
          onCopy={() => {
            console.log("copy: ", props.displayItem.copyText);
          }}
          title={`Copy Text`}
          content={props.displayItem.copyText || ""}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Search Query Text Online">
        {eudicWebUrl.length !== 0 && (
          <Action.OpenInBrowser icon={Icon.Globe} title="Eudic Dictionary" url={eudicWebUrl} />
        )}
        {youdaoWebUrl.length !== 0 && (
          <Action.OpenInBrowser icon={Icon.Globe} title="Youdao Dictionary" url={youdaoWebUrl} />
        )}

        <Action.OpenInBrowser
          icon={Icon.Globe}
          title="Google Translate"
          url={getGoogleWebTranslateURL(props.displayItem.queryWordInfo)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Play Text Audio">
        <Action
          title="Play Query Text"
          icon={playSoundIcon("black")}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => {
            console.log(`start play sound: ${props.displayItem.queryWordInfo.word}`);
            playYoudaoWordAudioAfterDownloading(props.displayItem.queryWordInfo);
          }}
        />
        <Action
          title="Play Result Text"
          icon={playSoundIcon("black")}
          onAction={() => {
            /**
             *  directly use say command to play the result text.
             *  because it is difficult to determine whether the result is a word, impossible to use Youdao web audio directly.
             *  in addition, TTS needs to send additional youdao query requests.
             */
            sayTruncateCommand(props.displayItem.copyText, props.displayItem.queryWordInfo.toLanguage);
          }}
        />
      </ActionPanel.Section>

      {myPreferences.isDisplayTargetTranslationLanguage && (
        <ActionPanel.Section title="Target Language">
          {languageItemList.map((selectedLanguageItem) => {
            // hide auto language
            const isAutoLanguage = selectedLanguageItem.youdaoLanguageId === "auto";
            // hide current detected language
            const isSameWithDetectedLanguage =
              selectedLanguageItem.youdaoLanguageId === props.displayItem.queryWordInfo.fromLanguage;
            const isSameWithTargetLanguage =
              selectedLanguageItem.youdaoLanguageId === props.displayItem.queryWordInfo.toLanguage;
            if (isAutoLanguage || isSameWithDetectedLanguage) {
              return null;
            }

            return (
              <Action
                key={selectedLanguageItem.youdaoLanguageId}
                title={selectedLanguageItem.languageTitle}
                onAction={() => props.onLanguageUpdate(selectedLanguageItem)}
                icon={isSameWithTargetLanguage ? Icon.ArrowRight : Icon.Globe}
              />
            );
          })}
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        {hasPrompted && <ActionRecentUpdate />}
        <ActionCurrentVersion />
        <ActionFeedback />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function playSoundIcon(lightTintColor: string) {
  return {
    source: { light: "play.png", dark: "play.png" },
    tintColor: { light: lightTintColor, dark: "lightgray" },
  };
}

/**
  Return the corresponding ImageLike based on the SectionType type
*/
export function getListItemIcon(sectionType: SectionType | TranslateType): Image.ImageLike {
  let dotColor: Color.ColorLike = Color.PrimaryText;
  switch (sectionType) {
    case TranslateType.Youdao: {
      dotColor = Color.Red;
      break;
    }
    case TranslateType.Apple: {
      dotColor = "#408080";
      break;
    }
    case TranslateType.Baidu: {
      dotColor = "#4169E1";
      break;
    }
    case TranslateType.Tencent: {
      dotColor = Color.Purple;
      break;
    }
    case TranslateType.Caiyun: {
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

  if (sectionType in TranslateType) {
    itemIcon = getTranslateTypeIcon(sectionType as TranslateType);
  }

  return itemIcon;
}

/**
 * Get translate type icon based on the section type
 */
function getTranslateTypeIcon(translatType: TranslateType): Image.ImageLike {
  return {
    source: `${translatType}-Translate.png`,
    mask: Image.Mask.RoundedRectangle,
  };
}

/**
  return List.Item.Accessory[] based on the SectionType type
*/
export function getWordAccessories(
  sectionType: SectionType | TranslateType,
  item: YoudaoTranslateReformatResultItem
): List.Item.Accessory[] {
  let wordExamTypeAccessory = [];
  let pronunciationAccessory = [];
  let wordAccessories: List.Item.Accessory[] = [];
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
      wordAccessories = [...wordAccessories, { text: " " }, ...pronunciationAccessory];
    }
  }
  return wordAccessories;
}
