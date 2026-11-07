import { Color, Icon, List } from "@raycast/api";
import { Tag } from "../lib/api";
import { ALL, ARCHIVED, DAILY_JOTS, NO_DAILY_JOTS, tagColor, tagFilterValue, UNTAGGED } from "../lib/tags";

export function UntaggedItem() {
  return <List.Dropdown.Item title="Notes Without Tags" value={UNTAGGED} icon={Icon.MinusCircle} />;
}

export function NoteFilterItems() {
  return (
    <>
      <List.Dropdown.Item title="All Notes Except Daily Jots" value={NO_DAILY_JOTS} icon={Icon.Document} />
      <List.Dropdown.Item
        title="Daily Jots"
        value={DAILY_JOTS}
        icon={{ source: Icon.Calendar, tintColor: Color.Orange }}
      />
      <UntaggedItem />
      <List.Dropdown.Item title="Archived" value={ARCHIVED} icon={Icon.Tray} />
    </>
  );
}

export default function TagDropdown(props: {
  tags: Tag[] | undefined;
  highlighted: string[];
  value: string;
  onChange: (value: string) => void;
  allTitle: string;
  extraItems?: React.ReactNode;
  topItems?: React.ReactNode;
}) {
  const tags = [...(props.tags ?? [])].sort((a, b) => a.text.localeCompare(b.text));
  const highlightedTags = tags.filter((tag) => props.highlighted.includes(tag.text));

  return (
    <List.Dropdown tooltip="Filter by Tag" value={props.value} onChange={props.onChange}>
      <List.Dropdown.Item title={props.allTitle} value={ALL} icon={Icon.List} />
      {props.topItems}
      {props.extraItems}
      {highlightedTags.length > 0 ? (
        <List.Dropdown.Section title="Highlighted Tags">
          {highlightedTags.map((tag) => (
            <List.Dropdown.Item
              key={`highlighted-${tag.text}`}
              title={tag.text}
              value={tagFilterValue(tag.text)}
              icon={{ source: Icon.Star, tintColor: tagColor(tag.text, props.tags) }}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
      <List.Dropdown.Section title="Tags">
        {tags
          .filter((tag) => !props.highlighted.includes(tag.text))
          .map((tag) => (
            <List.Dropdown.Item
              key={tag.text}
              title={tag.noteCount !== undefined ? `${tag.text} (${tag.noteCount})` : tag.text}
              value={tagFilterValue(tag.text)}
              icon={{ source: Icon.Tag, tintColor: tagColor(tag.text, props.tags) }}
            />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
