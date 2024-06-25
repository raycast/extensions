import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

interface Site {
  name: string;
  path: string;
}

interface HerdConfig {
  paths: string[];
}

const HERD_CONFIG_PATH = join(homedir(), "Library", "Application Support", "Herd", "config", "valet", "config.json");

async function getHerdConfig(): Promise<HerdConfig> {
  try {
    const configData = await readFile(HERD_CONFIG_PATH, "utf8");
    const config = JSON.parse(configData);
    if (Array.isArray(config.paths)) {
      return { paths: config.paths };
    }
    throw new Error("Invalid config structure");
  } catch (error) {
    console.error("Error reading Herd config:", error);
    throw new Error("Failed to read Herd configuration");
  }
}

async function getSites(paths: string[]): Promise<Site[]> {
  const sitePromises = paths.map(async (path) => {
    try {
      const files = await readdir(path, { withFileTypes: true });
      return files
        .filter((file) => file.isDirectory())
        .map((dir) => ({
          name: dir.name,
          path: join(path, dir.name),
        }));
    } catch (error) {
      console.error(`Error reading directory ${path}:`, error);
      return [];
    }
  });

  const nestedSites = await Promise.all(sitePromises);
  return nestedSites.flat();
}

export default function Command() {
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSites() {
      try {
        const config = await getHerdConfig();
        const fetchedSites = await getSites(config.paths);
        setSites(fetchedSites);
      } catch (error) {
        console.error("Error fetching sites:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch sites",
          message: "Please make sure Laravel Herd is installed and configured correctly.",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchSites();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sites...">
      {sites.map((site) => (
        <List.Item
          key={site.path}
          title={site.name}
          subtitle={site.path}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open in Visual Studio Code"
                icon={Icon.Code}
                target={site.path}
                application="/Applications/Visual Studio Code.app"
              />
              <Action.OpenInBrowser title="Open in Browser" url={`http://${site.name}.test`} />
              <Action.ShowInFinder path={site.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
