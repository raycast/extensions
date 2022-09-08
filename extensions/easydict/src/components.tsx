/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-04 00:36
 * @fileName: components.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Action, ActionPanel, Color, Icon, Image, List, openCommandPreferences } from "@raycast/api";
import { useState } from "react";
import { sayTruncateCommand } from "./audio";
import { getLingueeWebDictionaryURL } from "./dictionary/linguee/parse";
import { LingueeListItemType } from "./dictionary/linguee/types";
import { QueryWordInfo, YoudaoDictionaryListItemType } from "./dictionary/youdao/types";
import { getYoudaoWebDictionaryURL } from "./dictionary/youdao/utils";
import { playYoudaoWordAudioAfterDownloading } from "./dictionary/youdao/youdao";
import { languageItemList } from "./language/consts";
import {
  getBaiduWebTranslateURL,
  getDeepLWebTranslateURL,
  getEudicWebDictionaryURL,
  getGoogleWebTranslateURL,
} from "./language/languages";
import { myPreferences, preferredLanguage1, preferredLanguage2 } from "./preferences";
import ReleaseNotesPage from "./releaseVersion/releaseNotePage";
import { Easydict } from "./releaseVersion/versionInfo";
import { openInEudic } from "./scripts";
import {
  ActionListPanelProps,
  DicionaryType,
  ListDisplayItem,
  ListItemDisplayType,
  QueryType,
  TranslationType,
  WebQueryItem,
} from "./types";
import { checkIsLingueeListItemType, checkIsTranslationType, checkIsYoudaoDictionaryListItemType } from "./utils";

/**
 * Get the list action panel item with ListItemActionPanelItem
 */
export function ListActionPanel(props: ActionListPanelProps) {
  const [isShowingReleasePrompt, setIsShowingReleasePrompt] = useState<boolean>(props.isShowingReleasePrompt);

  const displayItem = props.displayItem;
  const queryWordInfo = displayItem.queryWordInfo;
  console.log(`---> current list type: ${displayItem.queryType}, copyText: ${displayItem.copyText}`);
  const googleWebItem = getWebQueryItem(TranslationType.Google, queryWordInfo);
  const isShowingGoogleTop = displayItem.queryType === TranslationType.Google;

  const deepLWebItem = getWebQueryItem(TranslationType.DeepL, queryWordInfo);
  const isShowingDeepLTop = displayItem.queryType === TranslationType.DeepL;

  const baiduWebItem = getWebQueryItem(TranslationType.Baidu, queryWordInfo);
  const isShowingBaiduTop = displayItem.queryType === TranslationType.Baidu;

  const lingueeWebItem = getWebQueryItem(DicionaryType.Linguee, queryWordInfo);
  const isShowingLingueeTop = displayItem.queryType === DicionaryType.Linguee;

  const youdaoWebItem = getWebQueryItem(DicionaryType.Youdao, queryWordInfo);
  const isShowingYoudaoDictioanryTop = displayItem.queryType === DicionaryType.Youdao;

  const eudicWebItem = getWebQueryItem(DicionaryType.Eudic, queryWordInfo);

  function onNewReleasePromptClick() {
    const easydict = new Easydict();
    easydict.hideReleasePrompt().then(() => {
      setIsShowingReleasePrompt(false);
    });
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {isShowingReleasePrompt && (
          <ReleaseNotesAction title="✨ New Version Released" onPush={onNewReleasePromptClick} />
        )}

        {props.isInstalledEudic && (
          <Action
            icon={Icon.MagnifyingGlass}
            title="Open In Eudic App"
            onAction={() => openInEudic(queryWordInfo.word)}
          />
        )}

        {isShowingLingueeTop && <WebQueryAction webQueryItem={lingueeWebItem} />}
        {isShowingYoudaoDictioanryTop && <WebQueryAction webQueryItem={youdaoWebItem} />}
        {isShowingDeepLTop && <WebQueryAction webQueryItem={deepLWebItem} />}
        {isShowingGoogleTop && <WebQueryAction webQueryItem={googleWebItem} />}
        {isShowingBaiduTop && <WebQueryAction webQueryItem={baiduWebItem} />}

        <Action.CopyToClipboard
          onCopy={() => {
            console.log("copy: ", displayItem.copyText);
          }}
          title={`Copy Text`}
          content={displayItem.copyText || ""}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Search Query Text Online">
        {!isShowingLingueeTop && <WebQueryAction webQueryItem={lingueeWebItem} />}
        {!isShowingYoudaoDictioanryTop && <WebQueryAction webQueryItem={youdaoWebItem} />}
        {<WebQueryAction webQueryItem={eudicWebItem} />}

        {!isShowingDeepLTop && <WebQueryAction webQueryItem={deepLWebItem} />}
        {!isShowingGoogleTop && <WebQueryAction webQueryItem={googleWebItem} />}
        {!isShowingBaiduTop && <WebQueryAction webQueryItem={baiduWebItem} />}
      </ActionPanel.Section>

      <ActionPanel.Section title="Play Text Audio">
        <Action
          title="Play Query Text"
          icon={playSoundIcon("black")}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => {
            console.log(`start play sound: ${queryWordInfo.word}`);
            playYoudaoWordAudioAfterDownloading(queryWordInfo);
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
             *
             *  Todo: add a shortcut to stop playing audio.
             */
            sayTruncateCommand(displayItem.copyText, queryWordInfo.toLanguage);
          }}
        />
      </ActionPanel.Section>

      {myPreferences.enableSelectTargetLanguage && (
        <ActionPanel.Section title="Target Language">
          {languageItemList.map((selectedLanguageItem) => {
            // hide auto language
            const isAutoLanguage = selectedLanguageItem.youdaoId === "auto";
            // hide current detected language
            const isSameWithDetectedLanguage = selectedLanguageItem.youdaoId === queryWordInfo.fromLanguage;
            const isSameWithTargetLanguage = selectedLanguageItem.youdaoId === queryWordInfo.toLanguage;
            if (isAutoLanguage || isSameWithDetectedLanguage) {
              return null;
            }

            return (
              <Action
                key={selectedLanguageItem.youdaoId}
                title={selectedLanguageItem.englishName}
                onAction={() => props.onLanguageUpdate(selectedLanguageItem)}
                icon={isSameWithTargetLanguage ? Icon.ArrowRight : { source: selectedLanguageItem.emoji }}
              />
            );
          })}
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        {!isShowingReleasePrompt && <ReleaseNotesAction />}
        <CurrentVersionAction />
        <ActionOpenCommandPreferences />
        <ActionFeedback />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function ActionFeedback() {
  const easydict = new Easydict();
  return <Action.OpenInBrowser icon={Icon.QuestionMark} title="Feedback" url={easydict.getIssueUrl()} />;
}

function ActionOpenCommandPreferences() {
  return <Action icon={Icon.Gear} title="Preferences" onAction={openCommandPreferences} />;
}

function ReleaseNotesAction(props: { title?: string; onPush?: () => void }) {
  return (
    <Action.Push
      icon={Icon.Stars}
      title={props.title || "Recent Updates"}
      target={<ReleaseNotesPage />}
      onPush={props.onPush}
    />
  );
}

function CurrentVersionAction() {
  const easydict = new Easydict();
  return (
    <Action.OpenInBrowser
      icon={Icon.Eye}
      title={`Version: ${easydict.version}`}
      url={easydict.getCurrentReleaseTagUrl()}
    />
  );
}

function playSoundIcon(lightTintColor: string) {
  return {
    source: { light: "play.png", dark: "play.png" },
    tintColor: { light: lightTintColor, dark: "lightgray" },
  };
}

/**
 * Return the corresponding ImageLike based on the ListDisplayType
 */
export function getListItemIcon(listDisplayType: ListItemDisplayType): Image.ImageLike {
  // console.log(`---> list type: ${listDisplayType}, typeof: ${typeof listDisplayType}`);

  let itemIcon: Image.ImageLike = {
    source: Icon.Dot,
    tintColor: Color.PrimaryText,
  };

  if (checkIsYoudaoDictionaryListItemType(listDisplayType)) {
    itemIcon = getYoudaoListItemIcon(listDisplayType as YoudaoDictionaryListItemType);
  }

  if (checkIsTranslationType(listDisplayType as TranslationType)) {
    // console.log(`---> TranslationType: ${listDisplayType}`);
    itemIcon = getQueryTypeIcon(listDisplayType as TranslationType);
  }

  // LingueeDisplayType is string enum, so we need to check if it is in the enum
  if (checkIsLingueeListItemType(listDisplayType)) {
    itemIcon = getLingueeListItemIcon(listDisplayType as LingueeListItemType);
  }

  // console.log(`---> end list type: ${listDisplayType}`);

  return itemIcon;
}

/**
 * Get ImageLike based on LingueeDisplayType
 */
export function getLingueeListItemIcon(lingueeDisplayType: LingueeListItemType): Image.ImageLike {
  // console.log(`---> linguee type: ${lingueeDisplayType}`);
  let dotColor: Color.ColorLike = Color.PrimaryText;
  switch (lingueeDisplayType) {
    case LingueeListItemType.Translation: {
      dotColor = Color.Red;
      break;
    }
    case LingueeListItemType.AlmostAlwaysUsed:
    case LingueeListItemType.OftenUsed: {
      dotColor = "#FF5151";
      break;
    }
    case LingueeListItemType.SpecialForms: {
      // French forms
      dotColor = "#00BB00";
      break;
    }
    case LingueeListItemType.Common: {
      dotColor = Color.Blue;
      break;
    }
    case LingueeListItemType.LessCommon: {
      dotColor = Color.Yellow;
      break;
    }
    case LingueeListItemType.Unfeatured: {
      dotColor = "#CA8EC2";
      break;
    }
    case LingueeListItemType.Example: {
      dotColor = "teal";
      break;
    }
    case LingueeListItemType.RelatedWord: {
      dotColor = "gray";
      break;
    }
    case LingueeListItemType.Wikipedia: {
      dotColor = "#8080C0";
      break;
    }
  }
  // console.log(`---> dot color: ${dotColor}`);
  const itemIcon: Image.ImageLike = {
    source: Icon.Dot,
    tintColor: dotColor,
  };
  return itemIcon;
}

/**
 * Get ImageLike based on YoudaoDisplayType
 */
export function getYoudaoListItemIcon(youdaoListType: YoudaoDictionaryListItemType): Image.ImageLike {
  // console.log(`---> getYoudaoListItemIcon type: ${queryType}`);
  let dotColor: Color.ColorLike = Color.PrimaryText;
  switch (youdaoListType) {
    case YoudaoDictionaryListItemType.Translation: {
      dotColor = Color.Red;
      break;
    }
    case YoudaoDictionaryListItemType.Explanation: {
      dotColor = Color.Blue;
      break;
    }
    case YoudaoDictionaryListItemType.WebTranslation: {
      dotColor = Color.Yellow;
      break;
    }
    case YoudaoDictionaryListItemType.WebPhrase: {
      dotColor = "teal";
      break;
    }
    case YoudaoDictionaryListItemType.Baike: {
      dotColor = "#B15BFF";
      break;
    }
  }

  // console.log(`---> dot color: ${dotColor}`);
  let itemIcon: Image.ImageLike = {
    source: Icon.Dot,
    tintColor: dotColor,
  };

  if (youdaoListType === YoudaoDictionaryListItemType.Forms) {
    itemIcon = Icon.Receipt;
  }

  return itemIcon;
}

/**
 * Get query type icon based on the query type, translation or dictionary type.
 */
function getQueryTypeIcon(queryType: QueryType): Image.ImageLike {
  return {
    source: `${queryType}.png`,
    mask: Image.Mask.RoundedRectangle,
  };
}

/**
 *  Get List.Item.Accessory[] based on the ListDisplayItem.
 */
export function getWordAccessories(item: ListDisplayItem): List.Item.Accessory[] {
  let wordExamTypeAccessory = [];
  let pronunciationAccessory = [];
  let wordAccessories: List.Item.Accessory[] = [];
  const accessoryItem = item.accessoryItem;
  if (accessoryItem) {
    if (accessoryItem.examTypes) {
      wordExamTypeAccessory = [
        {
          icon: { source: Icon.Star, tintColor: Color.SecondaryText },
          tooltip: "Word included in the types of exam",
        },
        { text: accessoryItem.examTypes?.join("  ") },
      ];
      wordAccessories = [...wordExamTypeAccessory];
    }
    if (accessoryItem.phonetic) {
      pronunciationAccessory = [
        {
          icon: playSoundIcon("gray"),
          tooltip: "Pronunciation",
        },
        { text: accessoryItem.phonetic },
      ];
      wordAccessories = [...wordAccessories, { text: " " }, ...pronunciationAccessory];
    }
  }
  return wordAccessories;
}

/**
 * Get WebQueryItem according to the query type and info
 */
function getWebQueryItem(queryType: QueryType, wordInfo: QueryWordInfo): WebQueryItem | undefined {
  const title = `Open In ${queryType}`;
  const icon = getQueryTypeIcon(queryType);

  let webUrl;
  switch (queryType) {
    case TranslationType.Google: {
      webUrl = getGoogleWebTranslateURL(wordInfo);
      break;
    }
    case TranslationType.DeepL: {
      webUrl = getDeepLWebTranslateURL(wordInfo);
      break;
    }
    case TranslationType.Baidu: {
      webUrl = getBaiduWebTranslateURL(wordInfo);
      break;
    }
    case DicionaryType.Linguee: {
      webUrl = getLingueeWebDictionaryURL(wordInfo);
      break;
    }
    case DicionaryType.Youdao: {
      webUrl = getYoudaoWebDictionaryURL(wordInfo);
      break;
    }
    case DicionaryType.Eudic: {
      webUrl = getEudicWebDictionaryURL(wordInfo);
      break;
    }
  }
  // console.log(`---> type: ${queryResult.type}, webUrl: ${webUrl}`);
  return webUrl ? { type: queryType, webUrl, icon, title } : undefined;
}

function WebQueryAction(props: { webQueryItem?: WebQueryItem }) {
  return props.webQueryItem?.webUrl ? (
    <Action.OpenInBrowser
      icon={props.webQueryItem.icon}
      title={props.webQueryItem.title}
      url={props.webQueryItem.webUrl}
    />
  ) : null;
}

export function checkIfPreferredLanguagesConflict() {
  if (preferredLanguage1.youdaoId === preferredLanguage2.youdaoId) {
    console.log("referredLanguage1 and referredLanguage2 are the same language");
    return (
      <List searchBarPlaceholder="Error">
        <List.Item
          title={"Preferred Languages Conflict"}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          subtitle={"Your First Language and Second Language must be different!"}
        />
      </List>
    );
  }
  return null;
}
