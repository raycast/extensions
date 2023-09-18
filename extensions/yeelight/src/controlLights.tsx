import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Icon, Color, Detail } from "@raycast/api";
import SetBrightnessForm from "./setBrightnessForm";
import { DeviceStatus, Discover, Yeelight } from "yeelight-awesome";

const LIGHT_PORT = 55443;
interface Light {
  host: string;
  port: number;
  bright: number;
  status: DeviceStatus;
}

export default function Command() {
  const [lights, setLights] = useState<Light[]>([]);
  const [isLoading, setLoading] = useState(true);

  function startDiscover() {
    const discover = new Discover({ debug: false });

    discover
      .start()
      .then((devices) => {
        const newLights = devices.map((device) => ({
          host: device.host,
          port: device.port,
          bright: device.bright,
          status: device.status,
        }));
        setLights(newLights);
        discover.destroy();
      })
      .catch(() => {
        discover.destroy();
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    startDiscover();
  }, []);

  async function toggleLight(light: Light, index: number) {
    const yeelight = new Yeelight({
      lightIp: light.host,
      lightPort: LIGHT_PORT,
    });

    yeelight.connect().then((l) => {
      l.toggle().then((updatedDevice) => {
        if (updatedDevice.success) {
          const cLights = [...lights];
          cLights[index].status = lights[index].status === "on" ? DeviceStatus.OFF : DeviceStatus.ON;
          setLights(cLights);
        }
        l.disconnect();
      });
    });
  }

  async function changeBrightness(light: Light, index: number, addBrightness: number) {
    const yeelight = new Yeelight({
      lightIp: light.host,
      lightPort: LIGHT_PORT,
    });
    yeelight.connect().then((l) => {
      let newBrightness = light.bright + addBrightness;

      if (light.bright <= 10 && addBrightness === -10) {
        newBrightness = 1;
      }

      if (light.bright >= 90 && addBrightness === 10) {
        newBrightness = 100;
      }

      if (light.bright < 10 && addBrightness === 10) {
        newBrightness = 10;
      }

      l.setBright(newBrightness).then((updatedDevice) => {
        if (updatedDevice.success) {
          const currLights = [...lights];
          currLights[index].bright = newBrightness;
          setLights(currLights);
        }
        l.disconnect();
      });
    });
  }

  function changeBrightnessPerc(data: number, index: number) {
    const newLights = [...lights];
    newLights[index].bright = data;
    setLights(newLights);
  }

  function onSetBrightness({ bright, index }: { bright: number; index: number }): void {
    const yeelight = new Yeelight({
      lightIp: lights[index].host,
      lightPort: LIGHT_PORT,
    });

    yeelight.connect().then((l) => {
      l.setBright(bright).then(() => {
        changeBrightnessPerc(Number(bright), index);
        l.disconnect();
      });
    });
  }

  return (
    <>
      {isLoading ? (
        <Detail isLoading={isLoading} />
      ) : (
        <>
          {lights.length === 0 ? (
            <Detail
              markdown="No lights were found.  
Is lan control activated for your lights?
See the README on how to enable it."
            />
          ) : (
            <List>
              {lights.map((light, index) => (
                <List.Item
                  key={index}
                  title={light.host}
                  subtitle={`${light.bright}%`}
                  icon={{ source: Icon.Circle, tintColor: light.status === DeviceStatus.ON ? Color.Green : Color.Red }}
                  actions={
                    <ActionPanel>
                      <Action
                        title={light.status === DeviceStatus.OFF ? "Turn On" : "Turn Off"}
                        onAction={() => toggleLight(light, index)}
                      />
                      {light.status === DeviceStatus.ON && (
                        <>
                          <Action.Push
                            icon={Icon.Pencil}
                            title="Set Brightness"
                            shortcut={{ modifiers: ["cmd"], key: "e" }}
                            target={
                              <SetBrightnessForm
                                currBright={light.bright}
                                onSetBrightness={onSetBrightness}
                                index={index}
                              />
                            }
                          />
                          <Action
                            icon={Icon.Plus}
                            title="Increase Brightness"
                            shortcut={{ modifiers: ["cmd"], key: "+" }}
                            onAction={() => changeBrightness(light, index, 10)}
                          />
                          <Action
                            icon={Icon.Minus}
                            title="Decrease Brightness"
                            shortcut={{ modifiers: ["cmd"], key: "-" }}
                            onAction={() => changeBrightness(light, index, -10)}
                          />
                        </>
                      )}
                    </ActionPanel>
                  }
                />
              ))}
            </List>
          )}
        </>
      )}
    </>
  );
}
