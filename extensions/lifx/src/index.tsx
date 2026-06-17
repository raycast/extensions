import { ActionPanel, Color, Cache, List, Action, showToast, Toast, getPreferenceValues, Icon } from "@raycast/api";
import { getProgressIcon, useCachedState } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Api, Lights } from "./lib/interfaces";
import { getHueIcon, getKelvinIcon, getLightIcon, parseDate } from "./lib/colorAlgos";
import constants, { COLORS, effects } from "./lib/constants";
import { cleanLights, SetEffect, SetLightState, toggleLight, FetchLights, checkApiKey } from "./lib/api";
const hexToHsl = require("hex-to-hsl");

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useCachedState<Lights.Light[]>("lights", []);
  const [sideBar, setSideBar] = useState<boolean>(false);

  const preferences = getPreferenceValues();

  const config = {
    headers: {
      Authorization: "Bearer " + preferences.lifx_token,
    },
    timeout: 7000,
  };

  async function fetchLights() {
    console.info(data);
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
      if (data.length === 0) {
        const results = await FetchLights(config);
        setData(results || []);
        setIsLoading(false);
        return;
      } else {
        setIsLoading(false);
        return;
      }
    } catch (error) {
      const toast = await showToast({
        style: Toast.Style.Failure,
        title: "Error",
      });
      if (error instanceof Error) {
        toast.message = error.message;
      }
      setIsLoading(false);
    }
  }

  async function togglePowerLight(id: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Toggling light",
    });
    try {
      await toggleLight(id, { duration: 1 }, config);
      updateState(
        id,
        undefined,
        undefined,
        data.find((i) => {
          return i.id == id;
        })?.power == "off"
          ? "on"
          : "off"
      );
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

  const updateState = (id: string, brig?: number, color?: string, power?: string) => {
    const newState = data.map((obj) => {
      if (obj.id === id) {
        if (power !== undefined) {
          obj.power = power;
        }
        if (brig !== undefined) {
          obj.brightness = brig;
        }
        if (color !== undefined) {
          const hsl = hexToHsl(color);
          console.log(hsl);
          obj.color.hue = hsl[0];
          console.log(obj.color.hue);
        }

        return obj;
      }
      return obj;
    });
    setData(newState);
  };

  async function setBrightness(id: string, brightness: number) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Setting brightness ",
    });
    try {
      await SetLightState(id, { brightness: brightness / 100 }, config);
      updateState(id, brightness / 100);
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
      updateState(id, undefined, color);
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
      title: "Cleaning Light",
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
    const temp = plus === true ? currentKelvin + 1000 : currentKelvin - 1000;
    try {
      await SetLightState(id, { color: `kelvin:${temp}` }, config);
      toast.style = Toast.Style.Success;
      toast.title = "Temperature Set";
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
          icon="lifx-icon-64.png"
          title="No lights found"
          description="Check if you have lights compatible with color"
        />
      ) : (
        data.map((light: Lights.Light, index) => (
          <List.Item
            key={light.id}
            icon={getLightIcon(light)}
            title={light.label}
            subtitle={light.group.name}
            keywords={[light.label, light.group.name, light.product.name]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Product Model" text={light.product.name} />
                    <List.Item.Detail.Metadata.Label title="Light Power" text={light.power} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Hue"
                      icon={getHueIcon(light.color.hue)}
                      text={light.color.hue.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      icon={getKelvinIcon(light.color.kelvin)}
                      title="Kelvin"
                      text={light.color.kelvin.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Brightness"
                      icon={
                        light.power == "on"
                          ? getProgressIcon(light.brightness, "#fffff")
                          : getProgressIcon(light.brightness, Color.SecondaryText)
                      }
                      text={light.brightness.toString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Group" text={light.group.name} />
                    <List.Item.Detail.Metadata.Label title="Location" text={light.location.name} />
                    <List.Item.Detail.Metadata.Label title="Last Seen" text={parseDate(light.last_seen)} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Connected" text={light.connected ? "Online" : "Offline"} />
                    <List.Item.Detail.Metadata.Label title="ID" text={light.id} />
                    <List.Item.Detail.Metadata.Label title="UUID" text={light.uuid} />

                    {/* <List.Item.Detail.Metadata.TagList title="Capabilities">
                      {light.product.capabilities.has_color && (
                        <List.Item.Detail.Metadata.TagList.Item text="Color" color={Color.Blue} />
                      )}
                      {light.product.capabilities.has_ir && (
                        <List.Item.Detail.Metadata.TagList.Item text="IR" color={Color.Blue} />
                      )}
                      {light.product.capabilities.has_multizone && (
                        <List.Item.Detail.Metadata.TagList.Item text="Multizone" color={Color.Blue} />
                      )}
                      {light.product.capabilities.has_variable_color_temp && (
                        <List.Item.Detail.Metadata.TagList.Item text="Var Temp" color={Color.Blue} />
                      )}
                      {light.product.capabilities.has_chain && (
                        <List.Item.Detail.Metadata.TagList.Item text="Chain" color={Color.Blue} />
                      )}
                    </List.Item.Detail.Metadata.TagList> */}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel title="Manage Light">
                <Action
                  icon={Icon.Power}
                  title={light.power === "off" ? "Toggle On" : "Toggle Off"}
                  onAction={() => togglePowerLight(light.id)}
                />
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
                {light.brightness < 0.9 && (
                  <Action
                    icon={Icon.Plus}
                    title="Increase Brightness"
                    onAction={() => setBrightness(light.id, light.brightness * 100 + 10)}
                  />
                )}
                {light.brightness > 0.1 && (
                  <Action
                    icon={Icon.Minus}
                    title="Decrease Brightness"
                    onAction={() => setBrightness(light.id, light.brightness * 100 - 10)}
                  />
                )}
                <ActionPanel.Section />
                {light.product.capabilities.has_color === true && (
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
                )}
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
                <Action
                  key="ToggleEffect"
                  icon={Icon.Power}
                  title="Turn off effect"
                  onAction={() => setEffect(light.id, Api.effectType.off)}
                />
                <ActionPanel.Section />
                <ActionPanel.Submenu title="􀇬   Set Kelvin">
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
                  key="Increase Kelvin"
                  icon={Icon.Plus}
                  title="Increase Color Temprature"
                  onAction={() => addlightTemp(true, light.color.kelvin, light.id)}
                />
                <Action
                  key="Decrease Kelvin"
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
        ))
      )}
    </List>
  );
}
