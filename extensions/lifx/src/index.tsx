import { ActionPanel, Cache, List, Action, showToast, Toast, getPreferenceValues, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import axios from "axios";
import { Lights } from "./interfaces";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const cache = new Cache();
  const preferences = getPreferenceValues();

  const config = {
    headers: {
      Authorization: "Bearer " + preferences.lifx_token,
    },
    timeout: 7000,
  };

  async function fetchLights() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching lights",
    });
    if (preferences.lifx_token) {
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "No token found";
      setIsLoading(false);
      return;
    }
    if (cache.isEmpty) {
    } else {
      setData(JSON.parse(cache.get("lights") || "[]"));
      setIsLoading(false);
      toast.style = Toast.Style.Success;
      toast.title = "Lights fetched";
      return;
    }
    axios
      .get("https://api.lifx.com/v1/lights/all", config,)
      .then((res) => {
        console.log(res.data);
        setData(res.data);
        setIsLoading(false);
        cache.set("lights", JSON.stringify(res.data));
        toast.style = Toast.Style.Success;
        toast.title = "Lights fetched";
      })
      .catch((err) => {
        console.log(err.response);
        toast.style = Toast.Style.Failure
        toast.title = "Error"
        setIsLoading(false)
      });
  }

  async function togglePowerLight(id: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Toggling light",
    });
    axios
      .post(`https://api.lifx.com/v1/lights/${id}/toggle`, {}, config)
      .then((res) => {
        console.log(res.data);
        if (res.data.results[0].status === "offline") {
          throw "Light is offline";
        }
        toast.style = Toast.Style.Success;
        toast.title = "Light " + res.data.results[0].power;
      })
      .catch((err) => {
        console.log(err.response);
        console.log(err)
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to toggle light";
        toast.message = err.response?.data?.error || err;
      });
  }

  useEffect(() => {
    fetchLights();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={true} navigationTitle="Lights">
      {data.length === 0 ? (
        <List.EmptyView icon={Icon.QuestionMark} title="No lights found" />
      ) : (
        data.map((light: Lights.Light, index) => (
          <List.Item
            key={index}
            icon="bulb-icon.png"
            title={light.label}
            subtitle={light.power === "on" ? "On" : "Off"}
            detail={<List.Item.Detail markdown={generateMarkdown(light)} />}
            actions={
              <ActionPanel>
                <Action title="Toggle power" onAction={() => togglePowerLight(light.id)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function generateMarkdown(light: any) {
  const md = String.raw`
  # ${light.label}
  #### ${light.product.name}
  - Location: ${light.location.name}
  - Group: ${light.group.name}
  - Connection: ${light.connected ? "online" : "offline"}
  #### Capabilities:
  - Color ${light.product.capabilities.has_color ? "✅" : "❌"}
  - variable color temp ${light.product.capabilities.has_variable_color_temp ? "✅" : "❌"}
  - infrared ${light.product.capabilities.has_ir ? "✅" : "❌"}
  -----
  ID: 823188
  `;
  return md;
}
