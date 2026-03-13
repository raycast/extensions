import { ActionPanel, List, Action, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as fs from "fs";
import { homedir } from "os";
import path from "path";

const jsonLocalFilePath = path.join(homedir(), "Downloads", "raycast_key_value.json");

export default function Command() {
  const prefs = getPreferenceValues<ExtensionPreferences>();

  // If jsonLocalFilePath exists in the local file system, use it
  let jsonFilePath = prefs.jsonFilePath;
  if (fs.existsSync(jsonLocalFilePath)) {
    jsonFilePath = jsonLocalFilePath;
  }

  const { isLoading, data } = useCachedPromise(
    async () => {
      return JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
    },
    [],
    { initialData: [] }
  );

  const createListItem = (key: string, value: string) => {
    return (
      <List.Item
        key={key}
        title={key}
        subtitle={value}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={value} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Key -> Value">{Object.keys(data).map((key) => createListItem(key, data[key]))}</List.Section>
      <List.Section title="Value -> Key">{Object.keys(data).map((key) => createListItem(data[key], key))}</List.Section>
    </List>
  );
}
