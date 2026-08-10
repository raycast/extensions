import { Detail, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ConnectedDrive, Regions, VehicleStatus } from "bmw-connected-drive";
import { useEffect, useRef, useState } from "react";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";

TimeAgo.addDefaultLocale(en);

// Create formatter (English).
const timeAgo = new TimeAgo("en-US");

export default function ViewTirePressure() {
  const [status, setStatus] = useCachedState<VehicleStatus>("status");
  const [isLoading, setIsLoading] = useState(true);

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
          setStatus(statusResp);
        }
      } catch (e) {
        if (e instanceof Error) {
          showToast({ style: Toast.Style.Failure, title: e.message });
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (!status) return <Detail isLoading={true} />;

  function convertToMonthYear(dateString: string): string {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleString("en-US", { month: "long", year: "numeric" });
    return formattedDate;
  }

  function convertToWorldWorld(inputString: string): string {
    const words = inputString.toLowerCase().split("_");
    const capitalizedWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1));
    const convertedString = capitalizedWords.join(" ");

    return convertedString;
  }

  const { requiredServices } = status;

  const lastUpdatedAt = new Date(status.lastUpdatedAt).getTime();

  return (
    <List isLoading={isLoading} filtering={false}>
      <List.Section title="Next Services" subtitle={"Updated " + timeAgo.format(lastUpdatedAt)}>
        {requiredServices.map((item, index) => (
          <List.Item
            key={index}
            title={convertToWorldWorld(item.type)}
            subtitle={`Due in ${convertToMonthYear(item.dateTime as unknown as string)} ${
              item.mileage ? `or ${item.mileage} km` : ``
            }`}
          />
        ))}
      </List.Section>
    </List>
  );
}

// {
//   "dateTime": "2025-11-01T00:00:00.000Z",
//   "mileage": 24000,
//   "type": "OIL",
//   "status": "OK",
//   "description": "Next service due after the specified distance or date."
// },
