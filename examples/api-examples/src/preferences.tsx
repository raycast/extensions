import { List, preferences, getPreferenceValues } from "@raycast/api";

export default function Command() {
  console.log("Typed preferences:", getPreferenceValues());

  const listItems = Object.entries(preferences).map(([key, preference]) => {
    const pref = preference as any;
    return (
      <List.Item
        key={key}
        title={key}
        subtitle={String(pref.value ?? pref.default ?? "(not defined)")}
        accessoryTitle={pref.type + (pref.required ? " (required)" : " (optional)")}
      />
    );
  });

  return <List>{listItems}</List>;
}
