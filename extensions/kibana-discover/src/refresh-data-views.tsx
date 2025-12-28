import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import https from "https";
import http from "http";

interface KibanaInstance {
  name: string;
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
  commonFields?: string[];
}

interface DataView {
  id: string;
  attributes?: {
    title?: string;
    name?: string;
  };
  title?: string;
  name?: string;
}

interface Preferences {
  instancesJson: string;
}

interface InstanceCache {
  instance: {
    name: string;
    url: string;
    commonFields?: string[];
  };
  dataViews: Array<{
    number: number;
    name: string;
    title: string;
    id: string;
  }>;
}

interface AllInstancesCache {
  [instanceName: string]: InstanceCache;
}

const CACHE_PATH = join(
  homedir(),
  "Library/Application Support/com.raycast.macos/Extensions/kibana-discover/cache.json",
);

function parseInstances(prefs: Preferences): KibanaInstance[] {
  if (!prefs.instancesJson || !prefs.instancesJson.trim()) {
    return [];
  }

  try {
    const instances = JSON.parse(prefs.instancesJson);
    if (Array.isArray(instances) && instances.length > 0) {
      return instances;
    }
  } catch (error) {
    console.error("Failed to parse instances JSON:", error);
  }

  return [];
}

function buildAuthHeaders(instance: KibanaInstance): Record<string, string> {
  const headers: Record<string, string> = {
    "kbn-xsrf": "true",
    "Content-Type": "application/json",
  };

  if (instance.apiKey) {
    headers["Authorization"] = `ApiKey ${instance.apiKey}`;
  } else if (instance.username && instance.password) {
    const auth = Buffer.from(
      `${instance.username}:${instance.password}`,
    ).toString("base64");
    headers["Authorization"] = `Basic ${auth}`;
  }

  return headers;
}

async function fetchDataViews(
  kibanaUrl: string,
  headers: Record<string, string>,
): Promise<DataView[]> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${kibanaUrl}/api/data_views`);
    const protocol = url.protocol === "https:" ? https : http;

    const options = {
      headers,
      rejectUnauthorized: false,
    };

    protocol
      .get(url.toString(), options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              const dataViews = result.data_view || result.index_pattern || [];
              const normalized = dataViews.map((view: DataView) => ({
                id: view.id,
                attributes: {
                  title: view.title,
                  name: view.name,
                },
              }));
              resolve(normalized);
            } else if (res.statusCode === 404) {
              fetchDataViewsLegacy(kibanaUrl, headers)
                .then(resolve)
                .catch(reject);
            } else {
              reject(
                new Error(`API returned status ${res.statusCode}: ${data}`),
              );
            }
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

async function fetchDataViewsLegacy(
  kibanaUrl: string,
  headers: Record<string, string>,
): Promise<DataView[]> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${kibanaUrl}/api/saved_objects/_find`);
    url.searchParams.append("type", "index-pattern");
    url.searchParams.append("per_page", "1000");
    url.searchParams.append("fields", "title");
    url.searchParams.append("fields", "name");

    const protocol = url.protocol === "https:" ? https : http;

    const options = {
      headers,
      rejectUnauthorized: false,
    };

    protocol
      .get(url.toString(), options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              resolve(result.saved_objects || []);
            } else {
              reject(
                new Error(`API returned status ${res.statusCode}: ${data}`),
              );
            }
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

async function refreshInstance(instance: KibanaInstance): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Fetching from ${instance.name}...`,
  });

  try {
    const headers = buildAuthHeaders(instance);
    const dataViews = await fetchDataViews(instance.url, headers);

    if (dataViews.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = `No data views found in ${instance.name}`;
      return;
    }

    dataViews.sort((a, b) => {
      const nameA = (
        a.attributes?.name ||
        a.attributes?.title ||
        a.title ||
        ""
      ).toLowerCase();
      const nameB = (
        b.attributes?.name ||
        b.attributes?.title ||
        b.title ||
        ""
      ).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const newInstanceCache = {
      instance: {
        name: instance.name,
        url: instance.url,
        commonFields: instance.commonFields,
      },
      dataViews: dataViews.map((view, index) => ({
        number: index + 1,
        name:
          view.attributes?.name ||
          view.attributes?.title ||
          view.title ||
          "Untitled",
        title: view.attributes?.title || view.title || "Untitled",
        id: view.id,
      })),
    };

    // Load existing cache and merge with new instance data
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    let allCaches: AllInstancesCache = {};

    if (existsSync(CACHE_PATH)) {
      try {
        const existing = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
        // Check if old format (single instance)
        if (
          existing.instance &&
          existing.dataViews &&
          !existing[Object.keys(existing)[0]]?.instance
        ) {
          // Convert old format to new
          allCaches = {
            [existing.instance.name]: existing,
          };
        } else {
          allCaches = existing;
        }
      } catch (error) {
        console.error("Error reading existing cache:", error);
      }
    }

    // Add or update this instance's cache
    allCaches[instance.name] = newInstanceCache;

    writeFileSync(CACHE_PATH, JSON.stringify(allCaches, null, 2));

    toast.style = Toast.Style.Success;
    toast.title = `Refreshed ${dataViews.length} data views`;
    toast.message = `From ${instance.name}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to fetch from ${instance.name}`;
    toast.message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching data views:", error);
  }
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [instances] = useState<KibanaInstance[]>(() => parseInstances(prefs));

  if (instances.length === 0) {
    showToast({
      style: Toast.Style.Failure,
      title: "No Kibana instances configured",
      message: "Please configure at least one Kibana instance in preferences",
    });
    openExtensionPreferences();
    return <List />;
  }

  // If only one instance, refresh it immediately
  if (instances.length === 1) {
    refreshInstance(instances[0]);
    return <List />;
  }

  // Multiple instances - show selection list
  return (
    <List searchBarPlaceholder="Select Kibana instance to refresh...">
      {instances.map((instance, index) => (
        <List.Item
          key={index}
          title={instance.name}
          subtitle={instance.url}
          accessories={[{ text: instance.apiKey ? "API Key" : "Basic Auth" }]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh This Instance"
                onAction={() => refreshInstance(instance)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
