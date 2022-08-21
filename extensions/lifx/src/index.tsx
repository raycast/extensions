import { ActionPanel, Color, Cache, List, Action, showToast, Toast, getPreferenceValues, Icon } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useState, useEffect } from "react";
import axios from "axios";
import { Api, Lights } from "./lib/interfaces";
import { getKelvinIcon, getLightIcon } from "./lib/colorAlgos";
import constants, { COLORS, effects } from "./lib/constants";
import { cleanLights, SetEffect, SetLightState, toggleLight } from "./lib/api";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<Lights.Light[]>([]);
  const [sideBar, setSideBar] = useState<boolean>(false);
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
    if (!preferences.lifx_token) {
      toast.style = Toast.Style.Failure;
      toast.title = "No token found";
      setIsLoading(false);
      return;
    }

    axios
      .get("https://api.lifx.com/v1/lights/all", config)
      .then((res) => {
        const items: [Lights.Light] = res.data;
        const filtered: Lights.Light[] = items.filter((item) => item.product.capabilities.has_color === true);
        setData(filtered);
        setIsLoading(false);
        cache.set("lights", JSON.stringify(res.data));
        toast.style = Toast.Style.Success;
        toast.title = "Lights fetched";
      })
      .catch((err) => {
        console.log(err.response);
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = err?.response?.data || err;
        setIsLoading(false);
      });
  }

  async function togglePowerLight(id: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Toggling light",
    });
    try {
      await toggleLight(id, { duration: 1 }, config);
      toast.style = Toast.Style.Success;
      toast.title = "Light toggled";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  async function setBrightness(id: string, brightness: number) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting brightness",
    });
    try {
      await SetLightState(id, { brightness: brightness / 100 }, config);
      toast.style = Toast.Style.Success;
      toast.title = "Brightness set";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  async function setLightColor(color: string, id: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting color",
    });
    try {
      await SetLightState(id, { color: color }, config);
      toast.style = Toast.Style.Success;
      toast.title = "Color set";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  async function cleanLight(id: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Cleaning L.ight",
    });
    try {
      await cleanLights(id, {}, config);
      toast.style = Toast.Style.Success;
      toast.title = "Light Cleaned";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  async function setLightTemp(kelvin: number, id: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting temperature",
    });
    try {
      await SetLightState(id, { color: `kelvin:${kelvin}` }, config);
      toast.style = Toast.Style.Success;
      toast.title = "Temperature set";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  async function addlightTemp(plus: boolean, currentKelvin: number, id: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: plus ? "Increasing Temperature" : "Decreasing Temperature",
    });
    const temp = plus ? currentKelvin + 1000 : currentKelvin - 1000;
    try {
      await SetLightState(id, { color: `kelvin:${temp}` }, config);
      toast.style = Toast.Style.Success;
      toast.title = "Temperature added";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  async function setEffect(uuid: string, effect: Api.effectType) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting Effect",
    });
    try {
      await SetEffect(uuid, effect, { color: "blue" }, config);
      toast.style = Toast.Style.Success;
      toast.title = "Effect Set";
    } catch (error) {
      console.log(error);
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.primaryAction = {
        title: "Retry",
        onAction(toast) {
          setEffect(uuid, effect);
        },
      };
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  }

  useEffect(() => {
    fetchLights();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={sideBar} navigationTitle="Lights">
      {data.length === 0 ? (
        <List.EmptyView
          key="empty"
          icon="https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/144/apple/325/thinking-face_1f914.png"
          title="No lights found"
          description="Check if you have lights compatible with color"
        />
      ) : (
        data.map((light: Lights.Light, index) => (
          <List.Section key={index} title={light.group.name}>
            <List.Item
              key={light.id}
              icon={getLightIcon(light)}
              title={light.label}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Product Model" text={light.product.name} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Hue"
                        icon={light.power === "off" ? getProgressIcon(0.0) : getProgressIcon(1.0)}
                        text={light.color.hue.toString()}
                      />
                      <List.Item.Detail.Metadata.Label title="Kelvin" text={light.color.kelvin.toString()} />
                      <List.Item.Detail.Metadata.Label
                        title="Brightness"
                        icon={getProgressIcon(light.brightness)}
                        text={light.brightness.toString()}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Group" text={light.group.name} />
                      <List.Item.Detail.Metadata.Label title="Location" text={light.location.name} />
                      <List.Item.Detail.Metadata.Label title="Last Seen" text={light.last_seen.toString()} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Connected"
                        text={light.connected ? "Online" : "Offline"}
                      />
                      <List.Item.Detail.Metadata.Label title="ID" text={light.id} />
                      <List.Item.Detail.Metadata.Label title="UUID" text={light.uuid} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel title="Manage Light">
                  <Action icon={Icon.Power} title="Toggle Power" onAction={() => togglePowerLight(light.id)} />
                  <ActionPanel.Submenu title="􀆭   Set Brightness">
                    {constants.brightness.map((brightness) => (
                      <Action
                        key={brightness}
                        icon={getProgressIcon(brightness / 100, Color.Blue)}
                        title={brightness.toString() + "% Brightness"}
                        onAction={() => {
                          setBrightness(light.id, brightness);
                        }}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <Action
                    icon={Icon.Plus}
                    title="Increase Brightness"
                    onAction={() => setBrightness(light.id, light.brightness + 0.1)}
                  />
                  <Action
                    icon={Icon.Minus}
                    title="Decrease Brightness"
                    onAction={() => setBrightness(light.id, light.brightness - 0.1)}
                  />
                  <ActionPanel.Section />
                  <ActionPanel.Submenu title="􀎑   Set Color">
                    {COLORS.map((color) => (
                      <Action
                        icon={{ source: Icon.CircleFilled, tintColor: color.value }}
                        title={color.name}
                        onAction={() => {
                          setLightColor(color.value, light.id);
                        }}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <ActionPanel.Submenu title="􀆿   Set Effect">
                    {effects.map((effect) => (
                      <Action
                        title={effect.name}
                        onAction={() => {
                          setEffect(light.id, effect.value);
                        }}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <ActionPanel.Section />
                  <ActionPanel.Submenu title="􀇬   Set Color Temprature">
                    {constants.kelvins.map((kelvin) => (
                      <Action
                        key={kelvin}
                        icon={getKelvinIcon(kelvin)}
                        title={kelvin.toString() + "K"}
                        onAction={() => {
                          setLightTemp(kelvin, light.id);
                        }}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <Action
                    key="Increase Temp"
                    icon={Icon.Plus}
                    title="Increase Color Temprature"
                    onAction={() => addlightTemp(true, light.color.kelvin, light.id)}
                  />
                  <Action
                    key="Decrease Temp"
                    icon={Icon.Plus}
                    title="Decrease Color Temprature"
                    onAction={() => addlightTemp(false, light.color.kelvin, light.id)}
                  />
                  <ActionPanel.Section />
                  <Action
                    key="sidebar"
                    icon={Icon.Sidebar}
                    title={sideBar ? "Hide SideBar" : "Show SideBar"}
                    onAction={() => setSideBar((sideBar) => !sideBar)}
                  />
                  <Action key="Clean" icon={Icon.Bolt} title="Clean" onAction={() => cleanLight(light.id)} />
                </ActionPanel>
              }
            />
          </List.Section>
        ))
      )}
    </List>
  );
}
