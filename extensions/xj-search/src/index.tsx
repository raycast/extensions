import { ActionPanel, List, Action, LocalStorage, getPreferenceValues } from "@raycast/api";
import * as yaml from "js-yaml";
import { readdirSync, readFileSync } from "fs";
import { useState, useEffect } from "react";
import path from "path";
import { Fzf } from "fzf";
import fs from "fs";

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

// Types and interfaces
interface Task {
  vars: { [key: string]: string };
  desc: string;
  cmd: string;
}
function readAndParseYaml(filePath: string): YamlFile | undefined {
  try {
    const yamlContent = readFileSync(filePath, "utf8");
    return yaml.load(yamlContent) as YamlFile;
  } catch (error) {
    console.warn(`Error reading YAML file: ${filePath}`, error);
    return undefined;
  }
}

interface YamlFile {
  vars: { namespace: string; icon?: string };
  tasks: { [key: string]: Task };
}

interface UrlInfo {
  title: string;
  description?: string;
  icon: string;
  url: string;
}
const END_WITH = "-chrome-taskfile.yaml";

// Helper Functions
function getYamlFiles(folderPath: string): string[] {
  return readdirSync(folderPath).filter((file) => file.endsWith(END_WITH));
}

function convertToUrlData(namespace2task: { [key: string]: { [key: string]: Task } }): unknown[] {
  return Object.entries(namespace2task).map(([namespace, tasks]) => ({
    namespace,
    urlsData: Object.entries(tasks).map(([taskName, task]) => ({
      title: taskName,
      description: task.desc || null,
      icon: task.vars?.icon || "🔍",
      url: task.vars?.URL,
    })),
  }));
}

function processYamlFile(
  folderPath: string,
  fileName: string,
  accumulator: { [key: string]: { [key: string]: Task } },
) {
  const filePath = path.join(folderPath, fileName);
  const parsedYaml = readAndParseYaml(filePath);

  if (!parsedYaml || !parsedYaml.vars || !parsedYaml.tasks) {
    console.warn(`Skipping invalid YAML file: ${fileName}`);
    return;
  }

  const namespace = parsedYaml.vars.namespace || fileName.replace(END_WITH, "");
  accumulator[namespace] = { ...accumulator[namespace], ...parsedYaml.tasks };
}

function convertYamlToJson(folderPath: string): string {
  console.log("Converting YAML to JSON");

  try {
    const yamlFiles = getYamlFiles(folderPath);
    console.log("Processing YAML files:", yamlFiles);

    const namespace2task: { [key: string]: { [key: string]: Task } } = {};
    yamlFiles.forEach((fileName) => processYamlFile(folderPath, fileName, namespace2task));

    return JSON.stringify(convertToUrlData(namespace2task));
  } catch (error) {
    console.error("Error processing YAML files:", error);
    return JSON.stringify([]);
  }
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
