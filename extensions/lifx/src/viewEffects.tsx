import { Icon, Toast, showToast, getPreferenceValues, List, Action, ActionPanel } from "@raycast/api";
import { Api } from "./lib/interfaces";
import { useState, useEffect } from "react";
import { FetchScenes, SetEffect, SetScenes } from "./lib/api";
import { effects } from "./lib/constants";

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

  const param: Api.effectParams = {
    color: "#ff0000"
  }

  async function setEffect(uuid: string, effect: Api.effectType) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting Effect",
    });
    try {
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
      {data &&
        effects.map((effect) => (
          <List.Item
            key={effect.value}
            title={effect.name}
            actions={
              <ActionPanel>
                <Action icon={Icon.Image} title="Set Effect" onAction={() => setEffect("all", effect.value)} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
