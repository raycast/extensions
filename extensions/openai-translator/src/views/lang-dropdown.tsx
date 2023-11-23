import { List } from "@raycast/api";
import { supportLanguages } from "../providers/lang";

export function LangDropdown(props: {
  type: string;
  selectedStandardLang: string;
  onLangChange: (newStandardLang: string) => void;
}) {
  const { type, selectedStandardLang, onLangChange } = props;

  const items = type == "To" ? supportLanguages : [["auto", "Auto"], ...supportLanguages];

  return (
    <List.Dropdown
      tooltip="Select Target Language"
      //storeValue={true}
      defaultValue={selectedStandardLang}
      onChange={(newValue) => {
        onLangChange(newValue);
      }}
    >
      <List.Dropdown.Section title={`Translate ${type}`}>
        {items.map(([standardLang, lang]) => (
          <List.Dropdown.Item key={standardLang} title={`${type} ${lang}`} value={standardLang} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
