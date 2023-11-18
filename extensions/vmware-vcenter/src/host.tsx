import { vCenter } from "./api/vCenter";
import { HostSummary } from "./api/types";
import { HostPowerStateIcon } from "./api/ui";
import * as React from "react";
import { List, Toast, getPreferenceValues, showToast } from "@raycast/api";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const preferences = getPreferenceValues();
const vCenterApi = new vCenter(preferences.vcenter_fqdn, preferences.vcenter_username, preferences.vcenter_password);

export default function Command(): JSX.Element {
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [Hosts, setHosts]: [HostSummary[], React.Dispatch<React.SetStateAction<HostSummary[]>>] = React.useState(
    [] as HostSummary[]
  );

  React.useEffect(() => {
    setIsLoading(true);
    vCenterApi
      .ListHost()
      .then((hosts) => {
        if (hosts) {
          setHosts([...hosts]);
        }
      })
      .catch(async (error) => {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
      });
    setIsLoading(false);
  }, []);

  if (!Hosts) return <List isLoading={isLoading}></List>;

  return (
    <List isLoading={isLoading}>
      {!isLoading &&
        Hosts.map((host) => (
          <List.Item key={host.host} id={host.host} title={host.name} icon={HostPowerStateIcon.get(host.power_state)} />
        ))}
    </List>
  );
}
