import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import ChangeImage from "./changeImage";
import { Distance } from "./types/Distance";
import { Info } from "./types/Info";
import { BASE_URL } from "./utils/constants";
import { getDistance } from "./utils/utils";

const boolToString = (value: boolean): string => (value ? "On" : "Off");

interface ViewCarProps {
  command?:
    | "remote_boombox"
    | "start_charging"
    | "stop_charging"
    | "honk"
    | "flash"
    | "enable_sentry"
    | "disable_sentry"
    | "start_max_defrost"
    | "stop_max_defrost"
    | "start_climate"
    | "stop_climate"
    | "vent_windows"
    | "close_windows"
    | "activate_rear_trunk"
    | "activate_front_trunk"
    | "open_charge_port"
    | "close_charge_port";
  loadingMessage?: string;
}

type TemperatureType = "fahrenheit" | "celsius";

const tempConversion = (celsius: number, tempType: TemperatureType) => {
  if (tempType === "fahrenheit") {
    return Math.round((celsius * 9) / 5 + 32);
  } else {
    return celsius;
  }
};

export default function ViewCar(props: ViewCarProps) {
  const preferences = getPreferenceValues<{
    tessieApiKey: string;
    VIN: string;
    temperature: TemperatureType;
    distance: Distance;
  }>();

  const API_KEY = preferences.tessieApiKey;
  const VIN = preferences.VIN;
  const tempType = preferences.temperature;
  const distanceType = preferences.distance;

  // Load saved image
  const [image, setImage] = useState<string | undefined>(undefined);
  useEffect(() => {
    (async () => {
      setImage(await LocalStorage.getItem<string>("IMAGE"));
    })();
  }, []);

  const { isLoading, data, revalidate } = useFetch<Info>(`${BASE_URL}/${VIN}/state`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  // Refresh car every 6 seconds
  // 5 to prevent ratelimit
  // so 6 to be safe
  useEffect(() => {
    const interval = setInterval(() => revalidate(), 6000);

    return () => clearInterval(interval);
  }, []);

  const runCommand = async () => {
    if (!props.command || !props.loadingMessage) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: props.loadingMessage,
    });

    toast.title = props.loadingMessage;

    try {
      const response = await fetch(
        `${BASE_URL}/${VIN}/command/${props.command}?retry_duration=40&wait_for_completion=true`,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );

      const result = (await response.json()) as {
        /** Whether the command was successful */
        result: boolean;

        /** Whether the vehicle was asleep */
        woke: boolean;
      };

      if (result.result) {
        toast.style = Toast.Style.Success;
        toast.title = "Done!";
        revalidate();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
      }
    } catch (err) {
      console.log(err);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
    }
  };

  useEffect(() => {
    if (VIN) runCommand();
  }, [VIN]);

  if (isLoading && !data) return <Detail isLoading={true} />;

  if (!data) return <Detail markdown="Failed to fetch your car data" />;

  if (!image) return <ChangeImage />;

  const formatCarModelName = (modelName: string): string => {
    modelName = modelName.replace(/([0-9]+)/, " $1");
    modelName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    return modelName;
  };

  const markdown = `
# ${data.display_name}

${formatCarModelName(data.vehicle_config.car_type)} v${data.vehicle_state.car_version}

![](${image})
`;

  const chargeState = data.charge_state.charging_state;

  const status = data.state.charAt(0).toUpperCase() + data.state.slice(1);

  const climate =
    boolToString(data.climate_state.is_climate_on) +
    " - " +
    tempConversion(data.climate_state.inside_temp ?? 0, tempType) +
    (tempType === "fahrenheit" ? "°F" : "°C") +
    " Inside";

  const security = `Sentry ${boolToString(data.vehicle_state.sentry_mode)} (${
    data.vehicle_state.locked ? "Locked" : "Unlocked"
  })`;

  const getChargingCompletionTime = (inputMinutes: number): string => {
    const currentDate = new Date();
    currentDate.setMinutes(currentDate.getMinutes() + inputMinutes);

    // Time in HH:MM format
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${ampm}`;

    // Format duration
    const durationHours = Math.floor(inputMinutes / 60);
    const durationMinutes = inputMinutes % 60;

    const durationStr = `${durationHours}h ${durationMinutes}m`;

    return `⚡️ ${durationStr} > ${strTime}`;
  };

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={{ value: status, color: status == "Online" ? Color.Green : Color.PrimaryText }}
          />
          <Detail.Metadata.Label
            title="Battery"
            text={{
              value: `${data.charge_state.battery_level}% - ${getDistance(
                data.charge_state.battery_range,
                distanceType
              ).toFixed(2)} ${preferences.distance}`,
              color: chargeState == "Charging" ? Color.Green : Color.PrimaryText,
            }}
          />
          <Detail.Metadata.Label
            title="Battery Status"
            text={{
              value:
                chargeState == "Charging"
                  ? getChargingCompletionTime(data.charge_state.minutes_to_full_charge)
                  : chargeState,
              color: chargeState == "Charging" ? Color.Green : Color.PrimaryText,
            }}
          />
          <Detail.Metadata.Label title="Climate" text={climate} />
          <Detail.Metadata.Label title="Security" text={security} />
          <Detail.Metadata.Label
            title="Odometer"
            text={`${getDistance(data.vehicle_state.odometer, distanceType).toLocaleString()} ${distanceType}`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel title="Shortcuts">
          <Action.Push target={<ChangeImage />} title="Change Car Image" icon={Icon.Image} />
        </ActionPanel>
      }
    />
  );
}
