import { List } from "@raycast/api";

import { Vocabulary } from "@/types";

const VocabularySwitch = ({ onChange }: { onChange: (value: Vocabulary) => void }) => {
  return (
    <List.Dropdown
      tooltip="Select a vocabulary"
      storeValue={true}
      onChange={(value) => onChange(value as Vocabulary)}
      placeholder="Select a vocabulary"
    >
      <List.Dropdown.Item title="English" value={Vocabulary.English} />
      <List.Dropdown.Item title="Spanish" value={Vocabulary.Spanish} />
      <List.Dropdown.Item title="Wikipedia (English)" value={Vocabulary.Wikipedia} />
    </List.Dropdown>
  );
};

export default VocabularySwitch;
