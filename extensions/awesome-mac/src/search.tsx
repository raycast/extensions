import { Action, ActionPanel, Icon, List } from "@raycast/api";
import fs from "fs";
import path from "path";
import { useEffect, useState } from "react";

interface AppItem {
  name: string;
  description: string;
  url: string;
  isOpenSource: boolean;
  isFreeware: boolean;
  isAppStore: boolean;
  isAwesomeList: boolean;
  category: string;
}

export default function Command() {
  const [searchResults, setSearchResults] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allApps, setAllApps] = useState<AppItem[]>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const readmeContent = fs.readFileSync(
      path.join("/Users/wei/source/raycast/extensions/extensions/awesome-mac/assets/README.md"),
      "utf-8",
    );

    const apps: AppItem[] = [];
    let currentCategory = "";

    const lines = readmeContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line is a category header
      if (line.startsWith("###")) {
        currentCategory = line.replace("###", "").trim();
      }

      // Check if line is an app entry (starts with *)
      if (line.startsWith("*")) {
        const appMatch = line.match(/\* \[(.+?)\]\((.+?)\)(.+)?/);
        if (appMatch) {
          const name = appMatch[1];
          const url = appMatch[2];
          const description = appMatch[3] || "";

          const app: AppItem = {
            name,
            description: description.trim(),
            url,
            category: currentCategory,
            isOpenSource: description.includes("[OSS Icon]"),
            isFreeware: description.includes("[Freeware Icon]"),
            isAppStore: description.includes("[app-store Icon]"),
            isAwesomeList: description.includes("[awesome-list Icon]"),
          };

          apps.push(app);
        }
      }
    }

    setAllApps(apps);
    setSearchResults(apps);
    setIsLoading(false);
  }, []);

  // Filter apps based on search text
  useEffect(() => {
    if (!searchText) {
      setSearchResults(allApps);
      return;
    }

    const lowerSearchText = searchText.toLowerCase();
    const filtered = allApps.filter((app) => {
      return (
        app.name.toLowerCase().includes(lowerSearchText) ||
        app.description.toLowerCase().includes(lowerSearchText) ||
        app.category.toLowerCase().includes(lowerSearchText)
      );
    });

    setSearchResults(filtered);
  }, [searchText, allApps]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search apps by name, description, or category..."
      filtering={false} // We handle filtering manually
    >
      {searchResults.map((app, index) => (
        <List.Item
          key={index}
          title={app.name}
          subtitle={app.category}
          accessories={[
            ...[
              app.isOpenSource && { icon: { source: Icon.Terminal } },
              app.isFreeware && { icon: { source: Icon.Gift } },
              app.isAppStore && { icon: { source: Icon.AppWindow } },
              app.isAwesomeList && { icon: { source: Icon.Star } },
            ].filter(Boolean),
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={app.url} />
              <Action.CopyToClipboard content={app.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
