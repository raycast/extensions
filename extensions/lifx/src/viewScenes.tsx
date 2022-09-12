import { Icon, Toast, showToast, getPreferenceValues, List, Action, ActionPanel } from "@raycast/api";
import { Api } from "./lib/interfaces";
import { useState, useEffect } from "react";
import { checkApiKey, FetchScenes, SetScenes } from "./lib/api";

export default function viewScenes() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Api.Scene[] | undefined>([]);
  const preferences = getPreferenceValues();

  const config = {
    headers: {
      Authorization: "Bearer " + preferences.lifx_token,
    },
    timeout: 7000,
  };

  async function fetchScenes() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching scenes",
    });

    try {
      const isTokenValid = await checkApiKey();
      if (!isTokenValid) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Token",
          message: "Please check your token and try again",
        });
        setIsLoading(false);
        return;
      }
      const response = await FetchScenes(config);
      setData(response);
      toast.style = Toast.Style.Success;
      toast.title = "Scenes fetched";
    } catch (error) {
      console.log(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
    }
    setIsLoading(false);
  }

  async function setScene(uuid: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting Scene",
    });
    try {
      await SetScenes(uuid, { duration: 3 }, config);
      toast.style = Toast.Style.Success;
      toast.title = "Scene Set";
    } catch (error) {
      console.log(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  useEffect(() => {
    fetchScenes();
  }, []);

  return (
    <List isLoading={isLoading}>
      {data?.length === 0 ? (
        <List.EmptyView
          key="empty"
          icon="lifx-icon-64.png"
          title="No scenes found"
          description="Check if you have any scenes for your lights"
        />
      ) : (
        data &&
        data.map((scene) => (
          <List.Item
            key={scene.uuid}
            title={scene.name}
            actions={
              <ActionPanel>
                <Action icon={Icon.Image} title="Set Scene" onAction={() => setScene(scene.uuid)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
