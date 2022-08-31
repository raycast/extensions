import { Icon, Toast, showToast, getPreferenceValues, List, Action, ActionPanel } from "@raycast/api";
import { Api } from "./lib/interfaces";
import { checkApiKey, SetEffect } from "./lib/api";
import { effects } from "./lib/constants";
import { useState } from 'react'

export default function viewScenes() {
  const preferences = getPreferenceValues();
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const config = {
    headers: {
      Authorization: "Bearer " + preferences.lifx_token,
    },
    timeout: 7000,
  };

  const param: Api.effectParams = {
    color: "red",
    persist: true,
    period: 5,
    direction: "forward",
  };
  async function setEffect(uuid: string, effect: Api.effectType) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting Effect",
    });
    try {
      setIsLoading(true)
      if (!preferences.has("lights")) {
        const isTokenValid = await checkApiKey()
        if (!isTokenValid) {
          preferences.set("lifx_token", JSON.stringify({ valid: true }));
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Token",
            message: "Please check your token and try again",
          });
          setIsLoading(false);
          return;
        }
      }
      await SetEffect(uuid, effect, param, config);
      toast.style = Toast.Style.Success;
      toast.title = "Effect Set";
    } catch (error) {
      console.log(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  return (
    <List isLoading={isLoading}>
      {effects.length === 0 ? (
        <List.EmptyView
          key="empty"
          icon="lifx-extension-icon.png"
          title="No effects found"
          description="Check if you have any effects for your lights"
        />
      ) : (
        effects.map((effect) => (
          <List.Item
            key={effect.value}
            title={effect.name}
            actions={
              <ActionPanel>
                <Action icon={Icon.Image} title="Set Effect" onAction={() => setEffect("all", effect.value)} />
                <Action
                  icon={Icon.Power}
                  title="Turn Off Effect"
                  onAction={() => setEffect("all", Api.effectType.off)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
