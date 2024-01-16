import { ActionPanel, List, Action, LocalStorage, getPreferenceValues } from "@raycast/api";
import { UrlInfo } from "./interface";
import { useState, useEffect } from "react";
import path from "path";
import { Fzf } from "fzf";
import fs from "fs";
import { convertYamlToJson } from "./utils";

const raycastKey = "raycast_search";

function fzfSearch(data: UrlInfo[], query: string): UrlInfo[] {
  const fzf = new Fzf(data, {
    selector: (item) => {
      // Normalize and split title
      const titleParts = item.title?.toLowerCase().split(/\s+|:/).join(" ") || "";

      // Normalize and split description
      const descriptionParts = item.description?.toLowerCase().split(/\s+|:/).join(" ") || "";

      // Normalize URL and split into parts
      const url = item.url?.toLowerCase() || "";
      const urlWithoutProtocol = url.replace(/^(https?:\/\/)?(www\.)?/, "");
      const urlParts = urlWithoutProtocol.split(/[\s\/\?&=.]+/).join(" ");

      // Combine all parts
      const combinedString = `${titleParts} ${descriptionParts} ${urlParts}`.trim();

      return combinedString;
    },
  });

  return fzf.find(query).map((result) => result.item);
}

function useRaycastData() {
  const [data, setData] = useState<UrlInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (forceReload = false) => {
    setLoading(true);
    const folderPath = getPreferenceValues<{ yamlFolderPath: string }>().yamlFolderPath;
    let finalData = forceReload
      ? await downloadAndSaveData(folderPath)
      : await LocalStorage.getItem<string>(raycastKey);
    finalData = finalData || (await downloadAndSaveData(folderPath));
    setData(parseData(finalData));
    setLoading(false);
  };

  const forceReloadData = () => fetchData(true);

  return { data, loading, forceReloadData };
}

async function saveJSONDataAsFile(data: string, filePath: string) {
  // save the data as new file use fs.writeFile
  fs.writeFile(filePath, data, (err: any) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log("File written successfully");
  });
}

// Function to download and save data
async function downloadAndSaveData(folderPath: string) {
  try {
    const jsonData = convertYamlToJson(folderPath);
    // cache file path: folderPath + "/.cache/urls.json"
    const cacheFilePath = path.join(folderPath, ".cache/urls.json");
    // create cache folder if not exist
    if (!fs.existsSync(path.join(folderPath, ".cache"))) {
      fs.mkdirSync(path.join(folderPath, ".cache"));
    }
    // save the data as new file use fs.writeFile
    saveJSONDataAsFile(jsonData, cacheFilePath);
    await LocalStorage.setItem(raycastKey, jsonData);
    return jsonData;
  } catch (error) {
    console.error("Error downloading YAML data:", error);
    throw error;
  }
}

// Function to parse the JSON data
function parseData(fileContents: string): UrlInfo[] {
  try {
    return ([] as UrlInfo[]).concat(
      ...JSON.parse(fileContents).map((nsData: { urlsData: UrlInfo[]; namespace: string }) =>
        nsData.urlsData.map((urlInfo) => ({ ...urlInfo, title: `${nsData.namespace} - ${urlInfo.title}` })),
      ),
    );
  } catch (error) {
    console.error("Error parsing JSON file:", error);
    return [];
  }
}

// Main component
export default function Command() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { data, loading, forceReloadData } = useRaycastData();

  const filteredData = searchTerm.length > 0 ? fzfSearch(data, searchTerm) : data;

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search URLs"
      onSearchTextChange={setSearchTerm}
      actions={
        <ActionPanel>
          <Action
            title="Reload Data"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={forceReloadData}
            icon={"🔃"}
          />
        </ActionPanel>
      }
    >
      {filteredData.map((urlInfo, index) => (
        <List.Item
          key={index}
          icon={urlInfo.icon || "🐷"}
          title={urlInfo.title}
          subtitle={`${urlInfo.description || ""} ${urlInfo.url}` || ""}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={urlInfo.url} title="Open URL in Browser" />
              <Action
                title="Reload Data"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={forceReloadData}
                icon={"🔃"}
              />
              <Action
                title="Add YAML Path"
                onAction={() => {
                  // Interaction for adding a YAML path not implemented
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
