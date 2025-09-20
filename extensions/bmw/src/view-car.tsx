import { Action, ActionPanel, Color, Detail, Icon, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { ConnectedDrive, Regions, RemoteServices, Vehicle, VehicleStatus } from "bmw-connected-drive";
import { useCachedState } from "@raycast/utils";
import { getImage } from "./utils/getImage";
import { ViewDirection } from "./types/ViewDirection";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import ChangeImage from "./change-image";
import { executeCommand } from "./utils/executeCommand";
import { getCommandDetails } from "./utils/getCommandsdDetail";

TimeAgo.addDefaultLocale(en);

// Create formatter (English).
const timeAgo = new TimeAgo("en-US");

export interface ViewCarProps {
  command: RemoteServices;
  loadingMessage: string;
  commandName: string;
}

export default function ViewCar(props: { command: RemoteServices | undefined }) {
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
    if (!VIN) return null;
    if (!api.current) return null;

    return (Object.keys(RemoteServices) as (keyof typeof RemoteServices)[]).map((key, index) => {
      const { command, commandName, icon } = getCommandDetails(RemoteServices[key]);
      console.log(command);
      if (commandName === "") return null;
      return (
        <Action
          key={index}
          icon={icon}
          title={commandName.replace(/\b\w/g, (c) => c.toUpperCase())}
          onAction={async () => await executeCommand(command, api.current, VIN)}
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

      if (api.current && props.command) {
        executeCommand(props.command, api.current, VIN);
      }
    })();
  }, [VIN]);

  if (!vehicles || !status) {
    return <Detail isLoading={true} />;
  }

  if (!vehicles.length || !status) {
    return <Detail isLoading={true} />;
  }

  const { doorsState, windowsState, location, combustionFuelLevel, currentMileage } = status;
  const lastUpdatedAt = new Date(status.lastUpdatedAt).getTime();
  const { brand, model, year } = vehicles[0].attributes;
  const markdown = `

# ${brand} ${model} ${year}

Last Update: ${timeAgo.format(lastUpdatedAt)}

![Car Image](${image.image})

`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            icon={{
              source: doorsState.combinedSecurityState === "SECURED" ? Icon.Lock : Icon.LockUnlocked,
              tintColor: doorsState.combinedSecurityState === "SECURED" ? Color.Green : Color.Red,
            }}
            title={"Lock Status"}
            text={doorsState.combinedSecurityState === "SECURED" ? "Locked" : "Unlocked"}
          />
          <Detail.Metadata.Label
            icon={Icon.Bolt}
            title={"Fuel"}
            text={`${combustionFuelLevel.remainingFuelPercent}% / ${combustionFuelLevel.range} km`}
          />
          <Detail.Metadata.Link
            title={"Location"}
            text={location.address.formatted}
            target={`https://www.google.com/maps/search/?api=1&query=${location.coordinates.latitude}%2C${location.coordinates.longitude}`}
          />
          <Detail.Metadata.Label title={"Millage"} text={`${currentMileage} km`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={"All Doors"} text={doorsState.combinedState === "CLOSED" ? "Closed" : "Open"} />
          <Detail.Metadata.Label title={"Hood"} text={doorsState.hood === "CLOSED" ? "Closed" : "Open"} />
          <Detail.Metadata.Label title={"Trunk"} text={doorsState.trunk === "CLOSED" ? "Closed" : "Open"} />
          <Detail.Metadata.Label
            title={"All Windows"}
            text={windowsState.combinedState === "CLOSED" ? "Closed" : "Open"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Image} title="Change Image" target={<ChangeImage />} />
          <ActionPanel.Section title="Remote Services">{renderCommand()}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
