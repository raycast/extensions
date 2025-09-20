import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import util from "util";
import fs from "fs";

const execPromise = util.promisify(exec);
const cliPath = "/Applications/Surfed.app/Contents/MacOS/surfed-cli.app/Contents/MacOS/surfed-cli";

interface Preferences {
  apikey?: string;
}

interface URLItem {
  title: string;
  url: string;
  imagePath: string;
}

interface CollectionItem {
  title: string;
  url: string;
}

interface TagItem {
  title: string;
  url: string;
}

interface SurfedResponse {
  version: number;
  urls?: URLItem[];
  collections?: CollectionItem[];
  tags?: TagItem[];
  error?: string;
}

export default function Command() {
  const [urls, setUrls] = useState<URLItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    const checkCLIPath = async () => {
      if (!fs.existsSync(cliPath)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Surfed App not found",
          message: `Please install Surfed before you can use the extension (https://surfed.app/).`,
        });
        return false;
      }
      return true;
    };

    const fetchURLs = async (query: string) => {
      if (query.length > 2 && (await checkCLIPath())) {
        setLoading(true);
        try {
          const apikey = preferences.apikey ? `--key ${preferences.apikey}` : "";
          const { stdout } = await execPromise(`${cliPath} '${query}' -j -l 50 -a ${apikey}`);
          const result: SurfedResponse = JSON.parse(stdout);

          if (result.error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Error",
              message: result.error,
            });
            setUrls([]);
            setCollections([]);
            setTags([]);
          } else {
            setUrls(result.urls || []);
            setCollections(result.collections || []);
            setTags(result.tags || []);
          }
        } catch (error) {
          console.error("Failed to fetch data:", error);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch data",
            message: error instanceof Error ? error.message : String(error),
          });
        } finally {
          setLoading(false);
        }
      } else {
        setUrls([]);
        setCollections([]);
        setTags([]);
      }
    };

    fetchURLs(searchText);
  }, [searchText]);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search..." onSearchTextChange={setSearchText}>
      {searchText.length < 3 ? (
        <List.EmptyView title="Start typing to search" description="Enter at least 3 characters to start the search." />
      ) : loading ? (
        <List.EmptyView title="Searching…" description="Loading search results" />
      ) : urls.length === 0 && collections.length === 0 && tags.length === 0 ? (
        <List.EmptyView title="No Results" description="No matching results found." />
      ) : (
        <>
          {collections.length > 0 && (
            <List.Section title="Collections">
              {collections.map((item, index) => (
                <List.Item
                  key={`collection-${index}`}
                  icon={{ source: "collection-icon.png" }} // Add the path to your collection icon here
                  title={item.title}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={item.url} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {tags.length > 0 && (
            <List.Section title="Tags">
              {tags.map((item, index) => (
                <List.Item
                  key={`tag-${index}`}
                  icon={{ source: "tag-icon.png" }} // Add the path to your tag icon here
                  title={item.title}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={item.url} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          {urls.length > 0 && (
            <List.Section title="History">
              {urls.map((item, index) => (
                <List.Item
                  key={`url-${index}`}
                  icon={{ source: item.imagePath }} // Add the path to your URL icon here
                  title={item.title ? item.title : item.url}
                  subtitle={item.url}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={item.url} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
