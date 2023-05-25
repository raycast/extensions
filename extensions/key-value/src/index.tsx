import { ActionPanel, List, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";

import * as fs from "fs";

interface Preferences {
  jsonFilePath: string;
}
import { useState, useEffect } from 'react';

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const preferences = await getPreferenceValues<Preferences>();
        setPreferences(preferences);
        setLoading(false);
      } catch (error) {
        showToast(Toast.Style.Failure, "Error fetching preferences");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <List isLoading={loading} />;
  }

  if (!preferences || !preferences.jsonFilePath) {
    showToast(Toast.Style.Failure, "No JSON file set");
    return null;
  }

  const jsonData = JSON.parse(fs.readFileSync(preferences.jsonFilePath, "utf8"));
  if (!jsonData) {
    showToast(Toast.Style.Failure, "Failed to read JSON file");
    return null;
  }

  const createListItem = (key: string, value: string) => {
    return <List.Item
      key={key}
      title={key}
      subtitle={value}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={value}
          />
        </ActionPanel>
      }
    />
  }

  return (
    <List>
      <List.Section title="Key -> Value" >
        {Object.keys(jsonData).map((key) => (
          createListItem(key, jsonData[key])
        ))}
      </List.Section>
      <List.Section title="Value -> Key" >
        {Object.keys(jsonData).map((key) => (
          createListItem(jsonData[key], key)
        ))}
      </List.Section>
    </List>
  );
}
