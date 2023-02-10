import { List, getPreferenceValues } from "@raycast/api";
import { useEffect } from "react";

import { commands } from "../package.json";

const preferenceData = commands.find((x) => x.name === "preferences")?.preferences;

export default function Command() {
  const preferences = getPreferenceValues();
  useEffect(() => {
    console.log("Typed preferences:", preferences);
  }, []);

  const listItems = (preferenceData || []).map((pref) => {
    return (
      <List.Item
        key={pref.name}
        title={pref.name}
        subtitle={String(preferences[pref.name] ?? "(not defined)")}
        accessories={[{ text: pref.type + (pref.required ? " (required)" : " (optional)") }]}
      />
    );
  });

  return <List>{listItems}</List>;
}
