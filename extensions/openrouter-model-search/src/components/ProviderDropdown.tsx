import { List, Icon } from "@raycast/api";

type ProviderOption = { id: string; name: string; icon?: string };

interface ProviderDropdownProps {
  providers: ProviderOption[];
  onProviderChange: (newValue: string) => void;
}

export function ProviderDropdown({ providers, onProviderChange }: ProviderDropdownProps) {
  return (
    <List.Dropdown
      tooltip="Filter by Provider"
      onChange={(newValue) => {
        onProviderChange(newValue);
      }}
    >
      <List.Dropdown.Item key="__all__" title="All Providers" value="__all__" />
      <List.Dropdown.Section title="Providers">
        {providers.map((provider) => (
          <List.Dropdown.Item
            key={`provider-${provider.id}`}
            title={provider.name}
            value={provider.id}
            icon={provider.icon || Icon.Globe}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
