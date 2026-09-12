import {
  List,
  showToast,
  ToastStyle,
  ActionPanel,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";

interface Scene {
  sceneId: string;
  sceneName: string;
  lastExecutedDate?: string;
  // Fügen Sie hier weitere Eigenschaften hinzu, die eine Scene haben könnte
}

const preferences = getPreferenceValues();
const SMARTTHINGS_API_TOKEN = preferences.apiToken; // Retrieve the API token from preferences
const SMARTTHINGS_LOCATION_ID = preferences.locationId; // Retrieve the location ID from preferences

export default function ShowScenes() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchScenes() {
      try {
        const response = await axios.get(
          `https://api.smartthings.com/v1/scenes?locationId=${SMARTTHINGS_LOCATION_ID}`,
          {
            headers: {
              Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
            },
          },
        );

        console.log("Fetched Scenes Payload:", response.data); // Log the payload
        const scenes: Scene[] = response.data.items;
        setScenes(scenes);
        setIsLoading(false);
      } catch (error) {
        showToast(
          ToastStyle.Failure,
          "Failed to fetch scenes",
          (error as Error).message,
        );
        setIsLoading(false);
      }
    }

    fetchScenes();
  }, []);

  const executeScene = async (sceneId: string) => {
    try {
      await axios.post(
        `https://api.smartthings.com/v1/scenes/${sceneId}/execute`,
        null,
        {
          headers: {
            Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
          },
        },
      );
      showToast(ToastStyle.Success, "Szene erfolgreich ausgeführt");
    } catch (error) {
      showToast(
        ToastStyle.Failure,
        "Fehler beim Ausführen der Szene",
        (error as Error).message,
      );
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Never executed";
    const date = new Date(timestamp);
    return date.toLocaleString(); // Format the date as a readable string
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Scenes...">
      {scenes.map((scene: any) => (
        <List.Item
          key={scene.sceneId}
          title={scene.sceneName || "Unnamed Scene"}
          accessoryTitle={`Last executed: ${formatDate(scene.lastExecutedDate)}`}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Execute Scene"
                onAction={() => executeScene(scene.sceneId)}
              />
            </ActionPanel>
          }
        />
      ))}
      {scenes.length === 0 && !isLoading && (
        <List.Item
          title="No Scenes Found"
          accessoryTitle="No scenes available for this location."
        />
      )}
    </List>
  );
}
