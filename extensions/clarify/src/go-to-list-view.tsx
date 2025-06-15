import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { getRequestConfig } from "./utils/net.util";
import { getText } from "./utils/schema.util";
import { useConfig } from "./utils/config.util";

interface Item {
  id: string;
  type: string;
  attributes: Record<string, never> & {
    _id: string;
    _created_at: string;
    _created_by: string;
    title: string;
    description: string;
    list_id: string;
    default_view_id: string;
    type: string;
  };
}

interface GoToListViewProps {
  object: string;
}

export default function GoToListView({ object }: GoToListViewProps) {
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
        const { data: listsResponse } = await axios.get(
          `${config.endpoints.api}/workspaces/${config.slug}/objects/${object}/lists?sortOrder[column]=rank&sortOrder[dir]=ASC&filter[type]=dynamic`,
          getRequestConfig(),
        );

        setResults(listsResponse.data);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to fetch lists", String(error));
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [config]);

  if (!config) {
    return null;
  }

  return (
    <List isLoading={isLoading} isShowingDetail throttle>
      {results.map((item) => (
        <List.Item
          key={item.id}
          title={item.attributes.title}
          accessories={[{ text: item.attributes.type }]}
          detail={
            <List.Item.Detail
              markdown={item.attributes.description}
              metadata={
                <List.Item.Detail.Metadata>
                  {[...Object.keys(item.attributes)].sort().map((key) => {
                    const val = item.attributes[key];
                    return <List.Item.Detail.Metadata.Label key={key} title={key} text={getText(val)} />;
                  })}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open List in Browser"
                url={`${config.endpoints.web}/workspaces/${config.slug}/objects/${object}/lists/${item.attributes._id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
