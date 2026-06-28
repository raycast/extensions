import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { LANG_LIST, TransAPIErrCode, VoiceCachePerfixKey } from "../common/const";
import { say, cache, getVoiceList } from "../common/itranslate.shared";
import { TranslateHistory } from "./TranslateHistory";
import { Action$ } from "raycast-toolkit";
import escape from "markdown-escape";
import { useState, useEffect } from "react";

const preferences: IPreferences = getPreferenceValues();

export function TranslateResult(props: {
  transRes: ITranslateRes;
  onLangUpdate?: (lang: ILangItem) => void;
  onImgOCR?: (path?: string) => void;
  fromMultiple?: boolean;
}) {
  function TranslateResultDetail() {
    if (props.transRes.code === TransAPIErrCode.Success) {
      const isMoreDetail = props.transRes.targetExplains && props.transRes.derivatives && props.transRes.isWord;
      const langsInfo = props.fromMultiple ? "" : `${props.transRes.from.langTitle} -> ${props.transRes.to.langTitle}`;
      const markdown = isMoreDetail
        ? ""
        : `${langsInfo}\n
  ${props.fromMultiple ? "" : "----"}
  **${escape(props.transRes.res)}**`;
      return (
        <List.Item.Detail
          markdown={markdown}
          metadata={
            isMoreDetail ? (
              <List.Item.Detail.Metadata>
                {!props.fromMultiple && <List.Item.Detail.Metadata.Label title={langsInfo} />}
                {!props.fromMultiple && <List.Item.Detail.Metadata.Separator />}
                <List.Item.Detail.Metadata.Label title={props.transRes.phonetic || ""} text="Explains" />
                {props.transRes.targetExplains?.map((explain) => {
                  return (
                    <List.Item.Detail.Metadata.Label
                      key={explain}
                      title={explain}
                      icon={{ source: Icon.Dot, tintColor: Color.Green }}
                    />
                  );
                })}
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="" text="Derivatives" />
                {props.transRes.derivatives?.map((derivative) => {
                  return (
                    <List.Item.Detail.Metadata.Label
                      key={derivative.key}
                      title={`${derivative.key} -> ${derivative.value.join("; ")}`}
                      icon={{ source: Icon.Dot, tintColor: Color.Blue }}
                    />
                  );
                })}
              </List.Item.Detail.Metadata>
            ) : null
          }
        />
      );
    } else {
      const markdown = props.fromMultiple
        ? ""
        : `[detecting...] -> ${props.transRes.to.langTitle}\n
  ---
      `;
      return <List.Item.Detail markdown={markdown}></List.Item.Detail>;
    }
  }

  const [currentSourceVoice, updateCurrentSourceVoice] = useState<string | undefined>(
    cache.get(`${VoiceCachePerfixKey}-${props.transRes.from.langId}`)
  );
  const [currentResVoice, updateCurrentResVoice] = useState<string | undefined>(
    cache.get(`${VoiceCachePerfixKey}-${props.transRes.to.langId}`)
  );

  useEffect(() => {
    updateCurrentSourceVoice(cache.get(`${VoiceCachePerfixKey}-${props.transRes.from.langId}`));
  }, [props.transRes.from.langId]);

  useEffect(() => {
    updateCurrentResVoice(cache.get(`${VoiceCachePerfixKey}-${props.transRes.to.langId}`));
  }, [props.transRes.to.langId]);

  return (
    <List.Item
      key={props.transRes.serviceProvider}
      icon={{ source: `${props.transRes.serviceProvider}.png` }}
      title={props.transRes.res || ""}
      detail={<TranslateResultDetail />}
      accessories={[{ text: props.transRes.code === TransAPIErrCode.Loading ? "loading..." : "" }]}
      actions={
        <ActionPanel>
          {props.onImgOCR && (
            <ActionPanel.Section>
              <Action
                icon={Icon.Maximize}
                title="Capture to Translate"
                onAction={() => {
                  props.onImgOCR && props.onImgOCR();
                }}
              />
              <Action$.SelectFile
                title="Select Image to Translate"
                icon={Icon.Finder}
                onSelect={(filePath) => {
                  if (!filePath) {
                    return;
                  }
                  props.onImgOCR && props.onImgOCR(filePath);
                }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.CopyToClipboard content={props.transRes.res} />
            <Action.Paste content={props.transRes.res} />
          </ActionPanel.Section>
          {preferences.quickSwitchLang && props.onLangUpdate && (
            <ActionPanel.Section>
              <ActionPanel.Submenu
                title="Select Target Language"
                icon={Icon.Repeat}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              >
                {LANG_LIST.map((lang) => {
                  return (
                    <Action
                      key={lang.langId}
                      title={lang.langTitle}
                      onAction={() => {
                        if (props.transRes.to.langId === lang.langId) {
                          showToast({
                            title: `The current target language is already ${lang.langTitle}`,
                            style: Toast.Style.Success,
                          });
                          return;
                        }
                        props.onLangUpdate && props.onLangUpdate(lang);
                      }}
                      icon={props.transRes.to.langId === lang.langId ? Icon.CircleProgress100 : Icon.Circle}
                    />
                  );
                })}
              </ActionPanel.Submenu>
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            {props.transRes.origin && currentSourceVoice && (
              <Action
                title="Play Source Sound"
                icon={Icon.SpeakerOn}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => say(props.transRes.origin, currentSourceVoice)}
              />
            )}
            {props.transRes.res && currentResVoice && (
              <Action
                title="Play Result Sound"
                icon={Icon.SpeakerOn}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() => say(props.transRes.res, currentResVoice)}
              />
            )}
            {
              <ActionPanel.Submenu
                title={`${currentSourceVoice ? "Change" : "Select"} Voice to Play ${props.transRes.from.langTitle}`}
                icon={Icon.Switch}
              >
                {getVoiceList().map((item) => {
                  return (
                    <Action
                      key={item.voice}
                      title={`${item.voice} | ${item.code}`}
                      autoFocus={currentSourceVoice === item.voice}
                      onAction={() => {
                        if (currentSourceVoice === item.voice) {
                          return;
                        }
                        updateCurrentSourceVoice(item.voice);
                        if (props.transRes.from.langId === props.transRes.to.langId) {
                          updateCurrentResVoice(item.voice);
                        }
                        cache.set(`${VoiceCachePerfixKey}-${props.transRes.from.langId}`, item.voice);
                        if (props.transRes.from.langId !== props.transRes.to.langId) {
                          say(props.transRes.origin, item.voice);
                        }
                      }}
                      icon={item.voice === currentSourceVoice ? Icon.CircleProgress100 : Icon.Circle}
                    />
                  );
                })}
              </ActionPanel.Submenu>
            }
            {props.transRes.from.langId !== props.transRes.to.langId && (
              <ActionPanel.Submenu
                title={`${currentResVoice ? "Change" : "Select"} Voice to Play ${props.transRes.to.langTitle}`}
                icon={Icon.Switch}
              >
                {getVoiceList().map((item) => {
                  return (
                    <Action
                      key={item.voice}
                      title={`${item.voice} | ${item.code}`}
                      autoFocus={currentResVoice === item.voice}
                      onAction={() => {
                        if (currentResVoice === item.voice) {
                          return;
                        }
                        updateCurrentResVoice(item.voice);
                        cache.set(`${VoiceCachePerfixKey}-${props.transRes.to.langId}`, item.voice);
                        say(props.transRes.res, item.voice);
                      }}
                      icon={item.voice === currentResVoice ? Icon.CircleProgress100 : Icon.Circle}
                    />
                  );
                })}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {preferences.enableHistory && (
              <Action.Push
                icon={Icon.BulletPoints}
                title="Open Translation Histories"
                shortcut={{ modifiers: ["cmd"], key: "h" }}
                target={<TranslateHistory />}
              />
            )}
            <Action
              icon={Icon.ComputerChip}
              title="Open iTranslate Preferences"
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
