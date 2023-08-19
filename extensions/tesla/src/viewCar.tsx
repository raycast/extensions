import { Color, Detail, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { Info } from "./types/Info";
import { State } from "./types/State";
import { Vehicle } from "./types/Vehicle";

const boolToString = (value: boolean): string => (value ? "On" : "Off");

const BASE_URL = "https://teslascope.com/api";

interface ViewCarProps {
  command?:
  | "honkHorn"
  | "flashLights"
  | "enableSentryMode"
  | "disableSentryMode"
  | "startAC"
  | "stopAC"
  | "ventWindows"
  | "closeWindows"
  | "openTrunk"
  | "openFrunk"
  | "openChargeDoor"
  | "closeChargeDoor";
  loadingMessage?: string;
}

export default function ViewCar(props: ViewCarProps) {
  const API_KEY = getPreferenceValues<{ apiKey: string }>().apiKey;

  const [carId, setCarID] = useState<string | undefined>(undefined);

  const {
    isLoading,
    data: carData,
    revalidate,
  } = useFetch<Info>(`${BASE_URL}/vehicle/${carId}?api_key=${API_KEY}`, { execute: false });

  const { isLoading: isLoadingState, data: state } = useFetch<State>(
    `${BASE_URL}/vehicle/${carId}/state?api_key=${API_KEY}`
  );

  const setUp = async () => {
    // We get the car ID from the vehicles API
    // The user could just provide this, but this is
    // one less step for the user
    // Once we get it, we keep it in storage

    setCarID(await LocalStorage.getItem<string>("CAR_ID"));

    try {
      const response = await fetch(`${BASE_URL}/vehicles?api_key=${API_KEY}`);
      const result = (await response.json()) as Vehicle[];
      const vehicle = result[0];

      setCarID(vehicle.public_id);
      await LocalStorage.setItem("CAR_ID", vehicle.public_id);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    setUp();
  }, []);

  const runCommand = async () => {
    if (!props.command || !props.loadingMessage) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: props.loadingMessage,
    });

    try {
      const response = await fetch(
        `https://teslascope.com/api/vehicle/${carId}/command/${props.command}?api_key=${API_KEY}`
      );
      const result = (await response.json()) as State;

      toast.style = Toast.Style.Success;
      toast.title = result.response;

      revalidate();
    } catch (err) {
      console.log(err);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
    }
  };

  useEffect(() => {
    if (carId) runCommand();
  }, [carId]);

  if (isLoading || isLoadingState) return <Detail isLoading={true} />;

  if (!carData || !state) return <Detail markdown="Failed to fetch your car data" />;

  const data = carData.response;

  const markdown = `
# ${data.name}

${data.model} (${data.year}) v${data.car_version}

![](Model3Black.png)
`;

  const chargeState = data.battery.charging_state;

  const status = state.response.charAt(0).toUpperCase() + state.response.slice(1);

  const climate = boolToString(data.climate.is_climate_on) + " - " + data.climate.inside + "°F Inside";

  const security = `Sentry ${boolToString(data.vehicle.sentry_mode)} (${data.vehicle.locked ? "Locked" : "Unlocked"})`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={data.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={{ value: status, color: status == "Online" ? Color.Green : Color.PrimaryText }}
          />
          <Detail.Metadata.Label
            title="Battery"
            text={{
              value: `${data.battery.level}% - ${data.battery.range} miles`,
              color: chargeState == "Charging" ? Color.Green : Color.PrimaryText,
            }}
          />
          <Detail.Metadata.Label
            title="Battery Status"
            text={{
              value: chargeState == "Charging" ? `Charging ⚡️ ${data.battery.time_remaining}h Remaining` : chargeState,
              color: chargeState == "Charging" ? Color.Green : Color.PrimaryText,
            }}
          />
          <Detail.Metadata.Label title="Climate" text={climate} />
          <Detail.Metadata.Label title="Security" text={security} />
          <Detail.Metadata.Label title="Odometer" text={`${data.odometer.toLocaleString()} miles`} />
        </Detail.Metadata>
      }
    />
  );
}
