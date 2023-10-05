import { vCenter } from "./api/vCenter";
import { NetworkSummary } from "./api/types";
import * as React from "react";
import { List, Toast, getPreferenceValues, showToast } from "@raycast/api";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const preferences = getPreferenceValues();
const vCenterApi = new vCenter(preferences.vcenter_fqdn, preferences.vcenter_username, preferences.vcenter_password);

export default function Command(): JSX.Element {
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [Networks, setNetworks]: [NetworkSummary[], React.Dispatch<React.SetStateAction<NetworkSummary[]>>] =
    React.useState([] as NetworkSummary[]);

  React.useEffect(() => {
    setIsLoading(true);
    vCenterApi
      .ListNetwork()
      .then((network) => {
        if (network) {
          setNetworks([...network]);
        }
      })
      .catch(async (error) => {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
      });
    setIsLoading(false);
  }, []);

  if (!Networks) return <List isLoading={isLoading}></List>;

  return (
    <List isLoading={isLoading}>
      {!isLoading &&
        Networks.map((network) => (
          <List.Item
            key={network.network}
            id={network.network}
            title={network.name}
            icon={{ source: "icons/network/network.svg" }}
          />
        ))}
    </List>
  );
}
