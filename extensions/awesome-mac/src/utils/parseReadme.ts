import fs from "fs";
import path from "path";

export interface AppItem {
  name: string;
  description: string;
  url: string;
  isOpenSource: boolean;
  isFreeware: boolean;
  isAppStore: boolean;
  isAwesomeList: boolean;
  category: string;
}

export function parseReadmeContent(): AppItem[] {
  try {
    const readmeContent = fs.readFileSync(
      path.join("/Users/wei/source/raycast/extensions/extensions/awesome-mac/src/README.md"),
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

    return apps;
  } catch (error) {
    console.error("Error parsing README:", error);
    return [];
  }
}
