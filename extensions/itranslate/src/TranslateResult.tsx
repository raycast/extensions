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
import { LANG_LIST, TransAPIErrCode } from "./const";

const preferences: IPreferences = getPreferenceValues();

export function TranslateResult(props: { transRes: ITranslateRes; onLangUpdate: (lang: ILangItem) => void }) {
  let duration = 0;
  if (props.transRes.end && props.transRes.start) {
    duration = props.transRes.end - props.transRes.start;
  }

  function TranslateResultDetail() {
    if (props.transRes.targetExplains && props.transRes.derivatives) {
      return (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
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
          }
        />
      );
    } else {
      return <List.Item.Detail markdown={props.transRes.res} />;
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
      title={props.transRes.res}
      detail={<TranslateResultDetail />}
      accessories={[{ text: props.transRes.code === TransAPIErrCode.Loading ? "loading..." : `${duration} ms` }]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={props.transRes.res} />
          {props.transRes.isWord && (
            <Action.CreateSnippet
              title="Save Vocab as Snippet"
              snippet={{
                text: generateSnippetText(),
                name: props.transRes.origin,
                keyword: "Vocabulary",
              }}
            />
          )}
          <Action
            icon={Icon.ComputerChip}
            title="Open iTranslate Preferences"
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={openCommandPreferences}
          />
          <ActionPanel.Submenu
            title="Select Target Language"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          >
            {preferences.quickSwitchLang &&
              LANG_LIST.map((lang) => {
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
                      props.onLangUpdate(lang);
                    }}
                    icon={props.transRes.to.langId === lang.langId ? Icon.CircleProgress100 : Icon.Circle}
                  />
                );
              })}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
