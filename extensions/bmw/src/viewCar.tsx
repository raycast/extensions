import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { ConnectedDrive, Regions, RemoteServices, Vehicle, VehicleStatus } from "bmw-connected-drive";
import { useCachedState } from "@raycast/utils";
import { getImage } from "./utils/getImage";
import { ViewDirection } from "./types/ViewDirection";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import ChangeImage from "./changeImage";

TimeAgo.addDefaultLocale(en);

// Create formatter (English).
const timeAgo = new TimeAgo("en-US");

export interface ViewCarProps {
  command?: RemoteServices;
  loadingMessage?: string;
}

export default function ViewCar(props: ViewCarProps) {
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
      const vehiclesResp = await api.current.getVehicles();

      if (vehiclesResp.length > 0) {
        const statusResp = await api.current.getVehicleStatus(vehiclesResp[0].vin);
        Clipboard.copy(JSON.stringify(vehiclesResp[0]));
        setVIN(vehiclesResp[0].vin);
        setStatus(statusResp);
      }
      setVehicles(vehiclesResp);

      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!VIN) return;

    (async () => {
      if (api.current) {
        console.log("Getting image");
        const imageResp = await getImage(VIN, image.view, api.current?.account);
        console.log(imageResp);
        setImage({ view: image.view, image: imageResp });
      }

      if (!props.command || !props.loadingMessage || !VIN) return;

      if (await confirmAlert({ title: `Are you sure you want to ${props.command}?` })) {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: props.loadingMessage,
        });

        console.log(VIN);

        try {
          let result;
          switch (props.command) {
            case "climate-now":
              result = await api.current?.startClimateControl(VIN);
              break;
            case "door-lock":
              result = await api.current?.lockDoors(VIN);
              break;
            case "door-unlock":
              result = await api.current?.unlockDoors(VIN);
              break;
            case "horn-blow":
              result = await api.current?.blowHorn(VIN);
              break;
            case "light-flash":
              result = await api.current?.flashLights(VIN);
              break;
            default:
              toast.style = Toast.Style.Failure;
              toast.title = "Unknown command";
              break;
          }

          console.log(props.command, result);

          if (result) {
            toast.style = Toast.Style.Success;
            toast.title = "Done!";
          }
        } catch (err) {
          console.log(err);
          toast.style = Toast.Style.Failure;
          toast.title = "Failed";
        }
        // do something
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
          <Action.Push title="Change Image" target={<ChangeImage />} />
        </ActionPanel>
      }
    />
  );
}
