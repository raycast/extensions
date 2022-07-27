import { Language } from "../deepl-api";
import { List } from "@raycast/api";

export default function SourceLanguageDropdown(props: {
  sourceLanguages: Language[];
  onSourceLanguageChange: (newValue: Language | undefined) => void;
}) {
  const { sourceLanguages, onSourceLanguageChange } = props;

  return (
    <List.Dropdown
      tooltip="Select Source Language"
      onChange={(newValue) => {
        onSourceLanguageChange(sourceLanguages.find((language: Language) => language.code == newValue) as Language);
      }}
    >
      <List.Dropdown.Section title="Source Language">
        <List.Dropdown.Item key="AUTODETECT" title="Autodetect" value="AUTODETECT" />
        {sourceLanguages.map((language) => (
          <List.Dropdown.Item key={language.code} title={language.name} value={`${language.code}`} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
