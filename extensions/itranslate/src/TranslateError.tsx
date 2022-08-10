import {
  Color,
  Action,
  Detail,
  ActionPanel,
  openCommandPreferences,
  getPreferenceValues,
  List,
  Icon,
} from "@raycast/api";
import { LANG_LIST, TRANS_SERVICES_AUTH_NAMES } from "./const";

const icon = { source: Icon.XMarkCircle, tintColor: Color.Red };

export function TranslateError(props: { transRes: ITranslateRes }) {
  return (
    <List.Item
      icon={{ source: `${props.transRes.serviceProvider}.png` }}
      title="Opps!!"
      accessories={[{ icon }]}
      detail={<List.Item.Detail markdown={`Sorry! We have some problems...`} />}
    />
  );
}

export function LanguageConflict() {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const langFirst = LANG_LIST.find((lang) => lang.langId == preferences.langFirst) || LANG_LIST[0];
  const langSecond = LANG_LIST.find((lang) => lang.langId == preferences.langSecond) || LANG_LIST[1];
  const markdown = `
  # Language Conflict \n
  Your first Language with second Language must be different.\n
  > ⚙️ Please enter \`↵\` to open iTranslate Preferences and update the language configuration ~
  `;
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Language Conflict"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="First language you selected">
            <Detail.Metadata.TagList.Item text={langFirst?.langTitle} color={Color.Green} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Second language you selected">
            <Detail.Metadata.TagList.Item text={langSecond?.langTitle} color={Color.Blue} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action icon={Icon.ComputerChip} title="Open iTranslate Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}

export function ServiceProviderMiss() {
  const preferences: IPreferences = getPreferenceValues<IPreferences>();
  const defaultServiceProvider = preferences.defaultServiceProvider;
  const auth_names = TRANS_SERVICES_AUTH_NAMES.get(defaultServiceProvider);
  const markdown = `
  # Welcome to use iTranslate 🎉🎉🎉 \n
  iTranslate is a translation extension that can customize translation service providers and support multiple languages\n
  Now we support this translation service providers: [Google](https://translate.google.cn)、[Deepl](https://www.deepl.com/pro-api?cta=header-pro-api)、[Youdao](https://ai.youdao.com)、[Baidu](https://fanyi-api.baidu.com)、[Tencent](https://fanyi.qq.com/translateapi)\n
  ## Before using the extension, follow these steps:
  1. ⚙️ Please enter \`↵\` to open iTranslate Preferences
  2. Config ${auth_names?.map((n) => `**${n}**`).join(" and ")} in the right area of the preferences window
  > ⚠️ The default translation service provider you selected is *${defaultServiceProvider}*\n
  # 🍻 Enjoy it !
  `;
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Welcome to use iTranslate"
      actions={
        <ActionPanel>
          <Action icon={Icon.ComputerChip} title="Open iTranslate Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
