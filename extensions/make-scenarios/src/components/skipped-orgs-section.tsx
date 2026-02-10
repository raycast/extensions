import { Color, Icon, List } from "@raycast/api";

export function SkippedOrgsSection({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  return (
    <List.Section
      title="Without API Access"
      subtitle="Free plans don't support API"
    >
      {names.map((name) => (
        <List.Item
          key={`skipped-${name}`}
          title={name}
          icon={{
            source: Icon.ExclamationMark,
            tintColor: Color.SecondaryText,
          }}
          accessories={[
            { tag: { value: "No API access", color: Color.Orange } },
          ]}
        />
      ))}
    </List.Section>
  );
}
