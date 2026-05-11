import { List } from "@raycast/api";

import { Language } from "@/types";

export type LanguageDropdownProps = {
  onLanguageChange: (language: Language) => void;
};

export default function LanguageDropdown({ onLanguageChange }: LanguageDropdownProps) {
  return (
    <List.Dropdown
      tooltip="Select a Language"
      placeholder="Language"
      storeValue
      defaultValue=""
      onChange={(val) => onLanguageChange(val as Language)}
    >
      <List.Dropdown.Item title="All" value={""} />
      <List.Dropdown.Item title="Arabic" value={Language.Arabic} />
      <List.Dropdown.Item title="Czech" value={Language.Czech} />
      <List.Dropdown.Item title="German" value={Language.German} />
      <List.Dropdown.Item title="Greek" value={Language.Greek} />
      <List.Dropdown.Item title="English" value={Language.English} />
      <List.Dropdown.Item title="Spanish" value={Language.Spanish} />
      <List.Dropdown.Item title="French" value={Language.French} />
      <List.Dropdown.Item title="Hindi" value={Language.Hindi} />
      <List.Dropdown.Item title="Hungarian" value={Language.Hungarian} />
      <List.Dropdown.Item title="Indonesian" value={Language.Indonesian} />
      <List.Dropdown.Item title="Italian" value={Language.Italian} />
      <List.Dropdown.Item title="Japanese" value={Language.Japanese} />
      <List.Dropdown.Item title="Korean" value={Language.Korean} />
      <List.Dropdown.Item title="Latin" value={Language.Latin} />
      <List.Dropdown.Item title="Dutch" value={Language.Dutch} />
      <List.Dropdown.Item title="Norwegian" value={Language.Norwegian} />
      <List.Dropdown.Item title="Polish" value={Language.Polish} />
      <List.Dropdown.Item title="Portuguese" value={Language.Portuguese} />
      <List.Dropdown.Item title="Romanian" value={Language.Romanian} />
      <List.Dropdown.Item title="Russian" value={Language.Russian} />
      <List.Dropdown.Item title="Swedish" value={Language.Swedish} />
      <List.Dropdown.Item title="Thai" value={Language.Thai} />
      <List.Dropdown.Item title="Turkish" value={Language.Turkish} />
      <List.Dropdown.Item title="Vietnamese" value={Language.Vietnamese} />
      <List.Dropdown.Item title="Chinese" value={Language.Chinese} />
    </List.Dropdown>
  );
}
