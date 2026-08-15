import { Icon, List, useNavigation } from "@raycast/api";
import { useSourceLanguage, useTargetLanguages } from "../hooks";
import { LanguageCode, languages, supportedLanguagesByCode } from "../languages";
import { TargetLanguageList } from "./TargetLanguageList";

export function LanguageDropdown() {
  const navigation = useNavigation();
  const [sourceLanguage, setSourceLanguage] = useSourceLanguage();
  const [targetLanguages] = useTargetLanguages();
  return (
    <List.Dropdown
      value={sourceLanguage}
      tooltip="Language"
      onChange={(value) => {
        if (value === "manageTargetLanguages") {
          navigation.push(<TargetLanguageList />);
        } else {
          setSourceLanguage(value as LanguageCode);
        }
      }}
    >
      <List.Dropdown.Item
        key="manageTargetLanguages"
        icon={Icon.Pencil}
        title={`Translate to  ->  ${targetLanguages.map((l) => supportedLanguagesByCode[l].name).join(" ")}`}
        value="manageTargetLanguages"
      />
      {languages.map((lang) => (
        <List.Dropdown.Item key={lang.code} title={lang.name} value={lang.code} />
      ))}
    </List.Dropdown>
  );
}
