import { Icon, List } from "@raycast/api";
import { PROVIDERS } from "../data/providers";
import { PROVIDER_ORDER, type Lens } from "../lib/catalog";

interface LensDropdownProps {
  value: Lens;
  onChange: (lens: Lens) => void;
}

/** List.Dropdown and Grid.Dropdown are the same component, so one serves both views. */
export default function LensDropdown({ value, onChange }: LensDropdownProps) {
  return (
    <List.Dropdown tooltip="Library" value={value} onChange={(next) => onChange(next as Lens)}>
      <List.Dropdown.Item title="All Libraries" value="all" icon={Icon.Circle} />
      {PROVIDER_ORDER.map((provider) => (
        <List.Dropdown.Item
          key={provider}
          title={PROVIDERS[provider].title}
          value={provider}
          icon={{ source: Icon.CircleFilled, tintColor: PROVIDERS[provider].color }}
        />
      ))}
    </List.Dropdown>
  );
}
