import { List } from "@raycast/api";
import { ToneType } from "../types";

export default function ToneTypeDropDown({ onToneTypeChange }: { onToneTypeChange: (toneType: ToneType) => void }) {
  type ToneTypeValues = (typeof ToneType)[keyof typeof ToneType];
  return (
    <List.Dropdown
      tooltip="Select Tone"
      onChange={(newValue) => {
        onToneTypeChange(newValue as ToneType);
      }}
    >
      <List.Dropdown.Section title="Tone Types">
        {Object.values(ToneType).map((toneType: ToneTypeValues) => (
          <List.Dropdown.Item key={toneType} title={toneType} value={toneType} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
