import { List } from "@raycast/api";
import { relativeLabel, upcomingDays } from "./lib/data";
import { NameActions } from "./lib/ui";

export default function Command() {
  const days = upcomingDays(8);
  return (
    <List navigationTitle="Today's Name Days">
      <List.Section title="Today and next 7 days (Vilnius time)">
        {days.map((day, i) => (
          <List.Item
            key={day.key}
            title={relativeLabel(i, day)}
            subtitle={day.label}
            accessories={[{ text: day.names.join(", ") }]}
            actions={<NameActions names={day.names} extra={day.label} />}
          />
        ))}
      </List.Section>
    </List>
  );
}
