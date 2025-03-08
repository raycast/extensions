import { showFailureToast } from "@raycast/utils";
import https from "https";

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

export async function fetchReadmeContent(): Promise<AppItem[]> {
  try {
    const readmeContent = await new Promise<string>((resolve, reject) => {
      const req = https.get(
        "https://raw.githubusercontent.com/jaywcjlove/awesome-mac/master/README.md",
        {
          headers: {
            Accept: "text/plain",
            "User-Agent": "Raycast-Extension",
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP error! Status: ${res.statusCode}`));
            return;
          }

          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            resolve(data);
          });
        },
      );

      req.on("error", (error) => {
        reject(error);
      });

      req.end();
    });

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
          const descriptionLower = description.toLowerCase();

          const app: AppItem = {
            name,
            description: description.trim(),
            url,
            category: currentCategory,
            isOpenSource: descriptionLower.includes("[oss icon]"),
            isFreeware: descriptionLower.includes("[freeware icon]"),
            isAppStore: descriptionLower.includes("[app-store icon]"),
            isAwesomeList: descriptionLower.includes("[awesome-list icon]"),
          };

          apps.push(app);
        }
      }
    }

    return apps;
  } catch (error) {
    console.error("Error parsing README:", error);
    showFailureToast("Failed to parse README", { message: "Error parsing README" });
    return [];
  }
}
