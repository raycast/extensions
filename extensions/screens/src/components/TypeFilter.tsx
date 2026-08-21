import { Icon, List } from '@raycast/api';
import { ALL_TYPES, TYPE_ICONS, TypeSection } from '../connection-type';

/**
 * Renders nothing when every connection shares one type: a dropdown whose only real choice is the
 * one already shown filters nothing.
 */
export default function TypeFilter({
  sections,
  value,
  onChange,
}: {
  sections: TypeSection[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (sections.length < 2) return null;

  return (
    <List.Dropdown tooltip="Filter by Type" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All Types" value={ALL_TYPES} icon={Icon.AppWindowGrid3x3} />
      <List.Dropdown.Section>
        {sections.map((section) => (
          <List.Dropdown.Item
            key={section.title}
            title={section.title}
            value={section.title}
            icon={TYPE_ICONS[section.types[0]]}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
