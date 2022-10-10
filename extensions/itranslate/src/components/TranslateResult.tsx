import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { LANG_LIST, TransAPIErrCode } from "../common/const";
import { say } from "../common/itranslate.shared";
import { TranslateHistory } from "./TranslateHistory";
import { Action$ } from "raycast-toolkit";
import escape from "markdown-escape";

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

  function generateSnippetText(): string {
    const icons = ["📕", "📗", "📘", "📙", "📓"];
    let snippet = `${icons[Math.floor(Math.random() * 5)]} Create date:\n    ${new Date().toLocaleString()}\n\n`;
    snippet += `🔍 Translate result (${props.transRes.from.langTitle} -> ${props.transRes.to.langTitle}):\n    ${props.transRes.res}\n\n`;
    if (props.transRes.phonetic) {
      snippet += `🗣️ Phonetic:\n    ${props.transRes.phonetic}\n\n`;
    }
    if (props.transRes.targetExplains) {
      snippet += `📖 Explains:\n    ${props.transRes.targetExplains.join("\n    ")}\n\n`;
    }
    if (props.transRes.derivatives) {
      snippet += `📜 Derivatives:\n    ${props.transRes.derivatives
        .map((d) => `${d.key} -> ${d.value}`)
        .join("\n    ")}\n\n`;
    }
    return snippet;
  }

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
          <Action.CopyToClipboard content={props.transRes.res} />
          {props.transRes.isWord && (
            <Action.CreateSnippet
              title="Save Vocab as Snippet"
              snippet={{
                text: generateSnippetText(),
                name: props.transRes.origin,
              }}
            />
          )}
          {preferences.quickSwitchLang && props.onLangUpdate && (
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
          )}
          {props.transRes.from.voice && (
            <Action
              title="Play Source Sound"
              icon={Icon.SpeakerOn}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => say(props.transRes.origin, props.transRes.from)}
            />
          )}
          {props.transRes.to.voice && (
            <Action
              title="Play Result Sound"
              icon={Icon.SpeakerOn}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => say(props.transRes.res, props.transRes.to)}
            />
          )}
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
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
