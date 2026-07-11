import { Detail, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ConnectedDrive, Regions, VehicleStatus } from "bmw-connected-drive";
import { useEffect, useRef, useState } from "react";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";

TimeAgo.addDefaultLocale(en);

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

  const { tireState } = status;

  const lastUpdatedAt = new Date(status.lastUpdatedAt).getTime();

  return (
    <List isLoading={isLoading} filtering={false}>
      <List.Section title="Tire Pressure" subtitle={"Updated " + timeAgo.format(lastUpdatedAt)}>
        <List.Item title="Front Left" subtitle={`${tireState.frontLeft.status.currentPressure / 100} bar`} />
        <List.Item title="Front Right" subtitle={`${tireState.frontRight.status.currentPressure / 100} bar`} />
        <List.Item title="Rear Left" subtitle={`${tireState.rearLeft.status.currentPressure / 100} bar`} />
        <List.Item title="Rear Right" subtitle={`${tireState.rearRight.status.currentPressure / 100} bar`} />
      </List.Section>
    </List>
  );
}
