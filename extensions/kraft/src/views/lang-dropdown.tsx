import { List } from "@raycast/api";
import { supportLanguages } from "../runtime/languages";

export function LangDropdown(props: {
  type: string;
  selectedStandardLang: string;
  onLangChange: (newStandardLang: string) => void;
}) {
  const { type, selectedStandardLang, onLangChange } = props;

  const items = type == "To" ? supportLanguages : [["auto", "Auto"], ...supportLanguages];
  const label = type === "To" ? "Output" : "Source";

  return (
    <List.Dropdown
      tooltip={`Select ${label} Language`}
      //storeValue={true}
      defaultValue={selectedStandardLang}
      onChange={(newValue) => {
        onLangChange(newValue);
      }}
    >
      <List.Dropdown.Section title={`${label} Language`}>
        {items.map(([standardLang, lang]) => (
          <List.Dropdown.Item key={standardLang} title={`${label} ${lang}`} value={standardLang} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
