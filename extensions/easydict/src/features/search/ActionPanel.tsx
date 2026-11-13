/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { Image } from "@raycast/api";
import { Action, ActionPanel, Color, Detail, Icon, open, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import StrokeOrderPage from "@/components/pages/StrokeOrderPage";
import { EASYDICT_VERSION, FEEDBACK_URL, getReleaseTagUrl, myPreferences } from "@/consts";
import { playQueryWordAudio, playTTS } from "@/core/audio";
import { renderStandaloneRow } from "@/core/content/render";
import type { ViewRow } from "@/core/content/viewTypes";
import { languageItemList } from "@/core/language/consts";
import type { LanguageItem } from "@/core/language/types";
import { clearQueryCache, hasEnabledQueryCache } from "@/core/query/cache";
import { getQueryTypeIcon } from "@/core/results/icons";
import type { QueryType, QueryWordInfo } from "@/core/results/types";
import { getStrokeOrderCharacters } from "@/core/stroke-order";
import { webQueryServices } from "@/providers/web";
import { logError, logTrace } from "@/shared/logger";
import { shortcuts } from "@/shared/shortcuts";

import ReleaseNotesPage from "./ReleaseNotePage";

// Action.Push mounts this component when navigating, so the full page is not built for every list row.
function ResultDetails({ item, actions }: { item: ViewRow; actions: Detail.Props["actions"] }) {
  return <Detail markdown={renderStandaloneRow(item)} actions={actions} />;
}

interface ActionListPanelProps {
  displayItem: ViewRow;
  isInstalledEudic: boolean;
  isShowingReleasePrompt: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onHideReleasePrompt: () => void;
  onLanguageUpdate: (language: LanguageItem) => void;
  onRequery: () => void;
  onRegenerate?: () => void;
}

interface WebQueryItem {
  type: QueryType;
  webUrl: string;
  icon: Image.ImageLike;
  title: string;
}

const queryWebItemTypes = webQueryServices.map((service) => service.type);

function openInEudic(queryText: string) {
  const url = `eudic://dict/${queryText}`;
  open(url).catch((error) => {
    logError("ActionPanel", `open in eudic error: ${error}`);
    showFailureToast(String(error), { title: "Eudic is not installed." });
  });
}

function getWebQueryItem({
  queryType,
  wordInfo,
}: {
  queryType: QueryType;
  wordInfo: QueryWordInfo;
}): WebQueryItem | undefined {
  const service = webQueryServices.find((s) => s.type === queryType);
  const webUrl = service?.getWebUrl?.(wordInfo);
  if (!webUrl) return undefined;
  return { type: queryType, webUrl, icon: getQueryTypeIcon(queryType), title: `Open in ${queryType}` };
}

function WebQueryAction({
  webQueryItem,
  enableShortcutKey,
}: {
  webQueryItem?: WebQueryItem;
  enableShortcutKey?: boolean;
}) {
  if (!webQueryItem?.webUrl) return null;
  return (
    <Action.OpenInBrowser
      icon={webQueryItem.icon}
      title={webQueryItem.title}
      url={webQueryItem.webUrl}
      shortcut={enableShortcutKey ? shortcuts.openOnline : undefined}
    />
  );
}

function ReleaseNotesAction({ title, onPush }: { title?: string; onPush?: () => void }) {
  return (
    <Action.Push icon={Icon.Stars} title={title || "Recent Updates"} target={<ReleaseNotesPage />} onPush={onPush} />
  );
}

function PrimaryActions({
  displayItem,
  isInstalledEudic,
  isShowingReleasePrompt,
  isFavorite,
  onToggleFavorite,
  onHideReleasePrompt,
  onRequery,
  onRegenerate,
}: {
  displayItem: ViewRow;
  isInstalledEudic: boolean;
  isShowingReleasePrompt: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onHideReleasePrompt: () => void;
  onRequery: () => void;
  onRegenerate?: () => void;
}) {
  const { copyText } = displayItem;
  const { query: queryWordInfo, type: queryType } = displayItem.service;
  const { fromLanguage, toLanguage, word } = queryWordInfo;
  const showEudic = isInstalledEudic && myPreferences.showOpenInEudicFirst;
  const strokeOrderCharacters = getStrokeOrderCharacters({
    fromLanguage,
    toLanguage,
    sourceText: word,
    translatedText: copyText,
  });

  const currentWebQueryAction = queryWebItemTypes.includes(queryType) ? (
    <WebQueryAction webQueryItem={getWebQueryItem({ queryType, wordInfo: queryWordInfo })} enableShortcutKey />
  ) : null;

  return (
    <ActionPanel.Section>
      {isShowingReleasePrompt && <ReleaseNotesAction title="✨ New Version Released" onPush={onHideReleasePrompt} />}

      {showEudic && <Action icon={Icon.MagnifyingGlass} title="Open in Eudic App" onAction={() => openInEudic(word)} />}

      <Action.CopyToClipboard
        title="Copy Text"
        content={copyText}
        onCopy={() => logTrace("ActionPanel", `copy: ${copyText}`)}
      />

      <Action
        icon={isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Star}
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        shortcut={shortcuts.toggleFavorite}
        onAction={onToggleFavorite}
      />

      {!showEudic && isInstalledEudic && (
        <Action icon={Icon.MagnifyingGlass} title="Open in Eudic App" onAction={() => openInEudic(word)} />
      )}

      <Action.Push
        title="Show More Details"
        icon={Icon.Eye}
        shortcut={shortcuts.showDetail}
        target={
          <ResultDetails
            item={displayItem}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Text"
                  content={copyText}
                  onCopy={() => logTrace("ActionPanel", `copy: ${copyText}`)}
                />
                {currentWebQueryAction}
              </ActionPanel>
            }
          />
        }
      />
      {strokeOrderCharacters.length > 0 && (
        <Action.Push
          title="Show Stroke Order"
          icon={Icon.Brush}
          target={<StrokeOrderPage characters={strokeOrderCharacters} />}
        />
      )}
      {currentWebQueryAction}
      {onRegenerate && <Action icon={Icon.ArrowClockwise} title="Regenerate AI Result" onAction={onRegenerate} />}
      <Action
        icon={Icon.ArrowClockwise}
        title="Requery All Services"
        shortcut={shortcuts.requery}
        onAction={onRequery}
      />
    </ActionPanel.Section>
  );
}

function OtherWebQuerySection({ queryType, queryWordInfo }: { queryType: QueryType; queryWordInfo: QueryWordInfo }) {
  return (
    <ActionPanel.Section title="Search Query Text Online">
      {queryWebItemTypes
        .filter((t) => t !== queryType)
        .map((t) => (
          <WebQueryAction webQueryItem={getWebQueryItem({ queryType: t, wordInfo: queryWordInfo })} key={t} />
        ))}
    </ActionPanel.Section>
  );
}

function AudioActions({
  queryWordInfo,
  copyText,
  toLanguage,
}: {
  queryWordInfo: QueryWordInfo;
  copyText: string;
  toLanguage: string;
}) {
  return (
    <ActionPanel.Section title="Read Text Audio">
      <Action
        title="Read Query Text"
        icon={Icon.Play}
        shortcut={shortcuts.readQueryText}
        onAction={() => {
          logTrace("ActionPanel", `start read sound: ${queryWordInfo.word}`);
          playQueryWordAudio(queryWordInfo);
        }}
      />
      <Action
        title="Read Result Text"
        icon={Icon.Play}
        shortcut={shortcuts.readResultText}
        onAction={() => playTTS(copyText, toLanguage)}
      />
    </ActionPanel.Section>
  );
}

function TargetLanguageSection({
  fromLanguage,
  toLanguage,
  onLanguageUpdate,
}: {
  fromLanguage: string;
  toLanguage: string;
  onLanguageUpdate: (language: LanguageItem) => void;
}) {
  if (!myPreferences.enableSelectTargetLanguage) return null;
  return (
    <ActionPanel.Section title="Target Language">
      {languageItemList
        .filter((lang) => lang.youdaoLangCode !== "auto" && lang.youdaoLangCode !== fromLanguage)
        .map((lang) => (
          <Action
            key={lang.youdaoLangCode}
            title={lang.langEnglishName}
            onAction={() => onLanguageUpdate(lang)}
            icon={
              lang.youdaoLangCode === toLanguage
                ? Icon.ArrowRight
                : myPreferences.flagsAreNotLanguages
                  ? Icon.Globe
                  : { source: lang.emoji }
            }
          />
        ))}
    </ActionPanel.Section>
  );
}

function SettingsActions({ isShowingReleasePrompt }: { isShowingReleasePrompt: boolean }) {
  return (
    <ActionPanel.Section>
      {!isShowingReleasePrompt && <ReleaseNotesAction />}
      <Action.OpenInBrowser
        icon={Icon.Document}
        title={`Version: ${EASYDICT_VERSION}`}
        url={getReleaseTagUrl(EASYDICT_VERSION)}
      />
      <Action icon={Icon.Gear} title="Preferences" onAction={openCommandPreferences} />
      <Action.OpenInBrowser icon={Icon.QuestionMark} title="Feedback" url={FEEDBACK_URL} />
      {hasEnabledQueryCache() && (
        <Action
          icon={Icon.Trash}
          title="Clear Query Cache"
          onAction={() => {
            clearQueryCache();
            showToast({ style: Toast.Style.Success, title: "Query Cache Cleared" });
          }}
        />
      )}
    </ActionPanel.Section>
  );
}

export function ListActionPanel(props: ActionListPanelProps) {
  const {
    displayItem,
    isShowingReleasePrompt,
    onHideReleasePrompt,
    isInstalledEudic,
    isFavorite,
    onToggleFavorite,
    onLanguageUpdate,
    onRequery,
    onRegenerate,
  } = props;
  const { copyText } = displayItem;
  const { query: queryWordInfo, type: queryType } = displayItem.service;
  const { fromLanguage, toLanguage } = queryWordInfo;

  return (
    <ActionPanel>
      <PrimaryActions
        displayItem={displayItem}
        isInstalledEudic={isInstalledEudic}
        isShowingReleasePrompt={isShowingReleasePrompt}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onHideReleasePrompt={onHideReleasePrompt}
        onRequery={onRequery}
        onRegenerate={onRegenerate}
      />
      <OtherWebQuerySection queryType={queryType} queryWordInfo={queryWordInfo} />
      <AudioActions queryWordInfo={queryWordInfo} copyText={copyText} toLanguage={toLanguage} />
      <TargetLanguageSection fromLanguage={fromLanguage} toLanguage={toLanguage} onLanguageUpdate={onLanguageUpdate} />
      <SettingsActions isShowingReleasePrompt={isShowingReleasePrompt} />
    </ActionPanel>
  );
}
