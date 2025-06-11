import { List, Icon, Image } from "@raycast/api";

interface PersonDropdownProps {
  people: { id: string; name: string; avatar: string }[] | undefined;
  onPersonChange: (personId: string) => void;
}

export function PersonDropdown({ people, onPersonChange }: PersonDropdownProps) {
  return (
    <List.Dropdown tooltip="Change Person" onChange={onPersonChange} storeValue>
      <List.Dropdown.Section>
        <List.Dropdown.Item key="all" value="all" title="Everyone" icon={Icon.TwoPeople} />
        {people?.map((person) => (
          <List.Dropdown.Item
            key={person.id}
            value={person.id}
            title={person.name}
            icon={{ source: person.avatar, mask: Image.Mask.Circle }}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
