import { List, getPreferenceValues } from "@raycast/api";
import language from "./language";

type Props = { onChangeTargetLang: (targetLang: string) => void };

const preferences = getPreferenceValues<Preferences>();

const LanguageDropdown = (props: Props) => {
  const { onChangeTargetLang } = props;
  const { source: userSelectSource, target } = preferences;

  return (
    <List.Dropdown
      value="setSecondLanguage"
      tooltip="setSecondLanguage"
      onChange={onChangeTargetLang}
      defaultValue={target}
    >
      <List.Dropdown.Section title="Select Second Language">
        {language.map(({ title, value }, index) => {
          return <List.Dropdown.Item key={index} title={title} value={value} />;
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};

export default LanguageDropdown;
