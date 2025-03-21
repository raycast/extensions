import { showFailureToast } from "@raycast/utils";
import https from "https";

/**
 * Cleans markdown formatting from description text
 * Removes various markdown link formats, image references, and icon tags
 */
function cleanMarkdownDescription(description: string): string {
  return (
    description
      .trim()
      // Remove nested icon links like [![Open-Source Software][OSS Icon]](https://github.com/...)
      .replace(/\[!?\[.*?\]\[.*?\]\]\(.*?\)/g, "")
      // Remove standalone icon references like ![Open-Source Software][OSS Icon]
      .replace(/!?\[.*?\]\[.*?\]/g, "")
      // Remove markdown links like [text](url)
      .replace(/\[.*?\]\(.*?\)/g, "")
      // Remove image markdown like ![alt](url)
      .replace(/!\[.*?\]\(.*?\)/g, "")
      // Remove any remaining icon tags like [OSS Icon] or [Freeware Icon]
      .replace(/\[.*?Icon\]/gi, "")
      // Replace multiple spaces with a single space
      .replace(/\s{2,}/g, " ")
      // Remove any trailing exclamation marks that might be left after cleaning
      .replace(/\s*!+\s*$/g, "")
      .trim()
  );
}

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

          // Clean description by removing markdown icon links and other unnecessary formatting
          const cleanDescription = cleanMarkdownDescription(description);
          description
            .replace(/\[!?\[.*?\]\[.*?\]\]\(.*?\)/g, "") // Remove nested icon links like [![Open-Source Software][OSS Icon]](https://github.com/...)
            .replace(/\[[\w\s-]+\]\[[\w\s-]+\s*Icon\]/gi, "") // Remove icon references like [OSS Icon]
            .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "") // Remove other nested markdown links
            .replace(/!\[.*?\]\(.*?\)/g, "") // Remove image markdown
            .replace(/\[\w+-?\w*\s?\w*\s?Icon\]/gi, "") // Remove remaining icon tags
            .replace(/\s{2,}/g, " ") // Replace multiple spaces with a single space
            .trim();
          const app: AppItem = {
            name,
            description: cleanDescription,
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
