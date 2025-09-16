import React from "react";
import {
  Action,
  ActionPanel,
  List,
  Clipboard,
  showHUD,
  getPreferenceValues,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import fs from "fs"; // Import Node.js File System module
import { DATA, Category } from "./data";

// Helper function remains the same
function getRandomItem<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Command() {
  // We'll use state to hold our data, which will be a mix of default and custom data.
  const [data, setData] = React.useState(DATA);
  const [isLoading, setIsLoading] = React.useState(true);

  // This effect runs once when the command launches to load custom data.
  React.useEffect(() => {
    async function loadCustomData() {
      try {
        const { customDataPath } = getPreferenceValues<{ customDataPath: string }>();

        if (customDataPath) {
          const fileContent = fs.readFileSync(customDataPath, "utf-8");
          const customData = JSON.parse(fileContent);

          // Merge default data with custom data
          const mergedData = { ...DATA };
          for (const key of Object.keys(mergedData) as Category[]) {
            if (customData[key] && Array.isArray(customData[key])) {
              // Using a Set to avoid duplicates
              const combined = [...new Set([...mergedData[key], ...customData[key]])];
              mergedData[key] = combined;
            }
          }
          setData(mergedData);
        }
      } catch (error) {
        // If the file is invalid or not found, show an error toast to the user.
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load custom data file",
          message: "Please check the file path in settings and ensure it's valid JSON.",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadCustomData();
  }, []);

  const handleCopy = (category: Category) => {
    // Use the data from our state, which might include the custom snippets
    const items = data[category];
    const randomText = getRandomItem(items);

    if (randomText) {
      Clipboard.copy(randomText);
      showHUD("📋 Gekopieerd naar het klembord!");
    } else {
      showHUD(`❌ Geen data gevonden voor categorie: ${category}`);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Kies een type content om te kopiëren...">
      {(Object.keys(data) as Category[]).map((category) => (
        <List.Item
          key={category}
          title={category.charAt(0).toUpperCase() + category.slice(1)}
          actions={
            <ActionPanel>
              <Action title="Kopieer Willekeurige Tekst" onAction={() => handleCopy(category)} />
              <Action
                title="Open Extension Preferences"
                onAction={openExtensionPreferences}
                shortcut={{ modifiers: ["cmd"], key: "," }} // Standard shortcut for preferences
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
