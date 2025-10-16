import {
  Color,
  Icon,
  MenuBarExtra,
  Toast,
  getPreferenceValues,
  showToast,
  open,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Vehicle, VehicleStatus, ConnectedDrive, Regions, RemoteServices } from "bmw-connected-drive";
import { useState, useRef, useEffect } from "react";
import { ViewDirection } from "./types/ViewDirection";
import { getCommandDetails } from "./utils/getCommandsdDetail";
import { getImage } from "./utils/getImage";

export default function Command() {
  const [vehicles, setVehicles] = useCachedState<Vehicle[]>("vehicles", []);
  const [status, setStatus] = useCachedState<VehicleStatus>("status");
  const [VIN, setVIN] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [image, setImage] = useCachedState<{ view: ViewDirection; image: string }>("image", {
    view: ViewDirection.FRONTSIDE,
    image: "",
  });

  const api = useRef<ConnectedDrive | null>(null);

  useEffect(() => {
    (async () => {
      const { username, password, region } = getPreferenceValues<{
        username: string;
        VIN?: string;
        password: string;
        region: Regions;
      }>();

      api.current = new ConnectedDrive(username, password, region); // Initialize the api

      try {
        const vehiclesResp = await api.current.getVehicles();

        if (vehiclesResp.length > 0) {
          const statusResp = await api.current.getVehicleStatus(vehiclesResp[0].vin);
          setVIN(vehiclesResp[0].vin);
          setStatus(statusResp);
        }
        setVehicles(vehiclesResp);
      } catch (e) {
        if (e instanceof Error) {
          showToast({ style: Toast.Style.Failure, title: e.message });
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  function renderCommand(): React.ReactNode {
    return (Object.keys(RemoteServices) as (keyof typeof RemoteServices)[]).map((key, index) => {
      const { command, commandName, icon } = getCommandDetails(RemoteServices[key]);
      if (commandName === "") return null;
      return (
        <MenuBarExtra.Item
          key={index}
          icon={icon}
          title={commandName.replace(/\b\w/g, (c) => c.toUpperCase())}
          onAction={async () =>
            launchCommand({
              name: command,
              type: LaunchType.UserInitiated,
            })
          }
        />
      );
    });
  }

  useEffect(() => {
    if (!VIN) return;

    (async () => {
      if (api.current) {
        const imageResp = await getImage(VIN, image.view, api.current?.account);
        setImage({ view: image.view, image: imageResp });
      }
    })();
  }, [VIN]);

  if (!vehicles || !status) {
    return null;
  }

  if (!vehicles.length || !status) {
    return null;
  }

  const { brand, model, year } = vehicles[0].attributes;
  const { doorsState, location, combustionFuelLevel, currentMileage } = status;

  return (
    <MenuBarExtra isLoading={isLoading} icon={"icon-menu.png"} tooltip="Your Pull Requests">
      <MenuBarExtra.Section title={`${brand} ${model} ${year}`}>
        <MenuBarExtra.Item
          icon={{
            source: doorsState.combinedSecurityState === "SECURED" ? Icon.Lock : Icon.LockUnlocked,
            tintColor: doorsState.combinedSecurityState === "SECURED" ? Color.Green : Color.Red,
          }}
          title={doorsState.combinedSecurityState === "SECURED" ? "Locked" : "Unlocked"}
          onAction={() => launchCommand({ name: "view-car", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          icon={Icon.Bolt}
          title={`${combustionFuelLevel.remainingFuelPercent}% / ${combustionFuelLevel.range} km`}
          onAction={() => launchCommand({ name: "view-car", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          icon={Icon.Pin}
          title={location.address.formatted}
          onAction={() =>
            open(
              `https://www.google.com/maps/search/?api=1&query=${location.coordinates.latitude}%2C${location.coordinates.longitude}`,
            )
          }
        />
        <MenuBarExtra.Item
          icon={Icon.Car}
          title={`${currentMileage} km`}
          onAction={() => launchCommand({ name: "view-car", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Commands">{renderCommand()}</MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
