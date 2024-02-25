import { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import fetch from "node-fetch";
import VariablesView from "./VariablesView";

interface Collection {
  id: string;
  name: string;
  variableIds: string[];
  remote: boolean;
  variableCount?: number;
}

interface ApiResponse {
  error?: boolean;
  meta?: {
    variableCollections: {
      [key: string]: {
        id: string;
        name: string;
        variableIds: string[];
        remote: boolean;
      };
    };
  };
}

interface CollectionsViewProps {
  accessToken: string;
  fileKey: string;
  onEditTokens: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CollectionsView: React.FC<CollectionsViewProps> = ({ accessToken, fileKey, onEditTokens }) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`, {
          headers: { "X-Figma-Token": accessToken },
        });
        const data: unknown = await response.json();

        const isApiResponse = (data: unknown): data is ApiResponse => {
          return typeof data === "object" && data !== null && "meta" in data;
        };

        if (!isApiResponse(data) || data.error) {
          showToast(Toast.Style.Failure, "Failed to fetch collections");
          return;
        }

        const collectionsData = data.meta?.variableCollections;
        if (!collectionsData) {
          showToast(Toast.Style.Failure, "Invalid collections data");
          return;
        }

        const filteredCollections = Object.values(collectionsData)
          .filter((collection) => typeof collection === "object" && collection !== null && !collection.remote)
          .map((collection) => ({
            ...collection,
            variableCount: collection.variableIds.length,
          }));

        setCollections(filteredCollections);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to fetch collections", String(error));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken, fileKey]);

  return (
    <List isLoading={isLoading}>
      {collections.map((collection) => (
        <List.Item
          key={collection.id}
          title={collection.name}
          accessories={[{ text: `${collection.variableCount} variables` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Variables"
                target={<VariablesView collectionId={collection.id} accessToken={accessToken} fileKey={fileKey} />}
              />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default CollectionsView;
