// work in progress command to show the capabilities of the vehicle

import { Clipboard, Color, Detail, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Capabilities, ConnectedDrive, Regions } from "bmw-connected-drive";
import { useEffect, useRef, useState } from "react";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";

TimeAgo.addDefaultLocale(en);

export default function Capabilities() {
  const [capabilities, setCapabilities] = useCachedState<Capabilities>("capabilities");
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
          const capabilitiesResp = await api.current.getVehicleCapabilities(vehiclesResp[0].vin);
          Clipboard.copy(JSON.stringify(capabilitiesResp));
          setCapabilities(capabilitiesResp);
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

  if (!capabilities) return <Detail isLoading={true} />;

  const list = Object.entries(capabilities);

  return (
    <List isLoading={isLoading} filtering={false}>
      <List.Section title="Capabilities">
        {list.map(([key]) => (
          <List.Item
            title={key}
            accessories={[
              { text: `An Accessory Text`, icon: Icon.Hammer },
              { text: { value: `A Colored Accessory Text`, color: Color.Orange }, icon: Icon.Hammer },
              { icon: Icon.Person, tooltip: "A person" },
              { text: "Just Do It!" },
              { date: new Date() },
              { tag: new Date() },
              { tag: { value: new Date(), color: Color.Magenta } },
              { tag: { value: "User", color: Color.Magenta }, tooltip: "Tag with tooltip" },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
