import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { getRequestConfig } from "./utils/net.util";
import { getName, getText } from "./utils/schema.util";
import { withAuth } from "./auth.provider";
import { useConfig } from "./utils/config.util";

interface Item {
  id: string;
  type: string;
  attributes: {
    object: string;
    highlight: string[];
    record: Record<string, unknown> & {
      _id: string;
      _created_at: string;
      _created_by: string;
      name?: string | { first_name: string; last_name: string };
      description?: string;
      email_addresses?: {
        items: string[];
      };
    };
  };
}

function Command() {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { config } = useConfig();

  useEffect(() => {
    if (!config) {
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);

      try {
        const response = await axios.get(
          `${config.endpoints.api}/workspaces/${config.slug}/search/records?q=${query}`,
          getRequestConfig(),
        );

        setResults(response.data.data);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to fetch records", String(error));
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [config, query]);

  if (!config) {
    return null;
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} isShowingDetail throttle>
      {results.map((item) => {
        let markdown = item.attributes.record.description || "*Description is not available.*";

        const emails = item.attributes.record.email_addresses?.items;
        if (item.attributes.object === "person") {
          markdown += `\n\nEmails: ${emails?.join(", ") || "n/a"}`;
        }

        return (
          <List.Item
            key={item.id}
            title={getName(item.attributes.record.name)}
            accessories={[{ text: item.attributes.object.charAt(0).toUpperCase() + item.attributes.object.slice(1) }]}
            detail={
              <List.Item.Detail
                markdown={markdown}
                metadata={
                  <List.Item.Detail.Metadata>
                    {[...Object.keys(item.attributes.record)].sort().map((key) => {
                      const val = item.attributes.record[key];
                      return <List.Item.Detail.Metadata.Label key={key} title={key} text={getText(val)} />;
                    })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Record in Browser"
                  url={`${config.endpoints.web}/workspaces/${config.slug}/objects/${item.attributes.object}/records/${item.attributes.record._id}`}
                />
                {emails && emails[0] && (
                  <Action.CopyToClipboard
                    title="Copy Primary Email"
                    content={emails[0]}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default withAuth(Command);
