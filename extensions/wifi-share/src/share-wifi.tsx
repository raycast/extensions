import { useState, useEffect } from "react";
import { ActionPanel, Detail, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import QRCode from "qrcode";

const DetailPassword = ({
  networkName,
  setIsLoading,
}: {
  networkName: string;
  setIsLoading: (loading: boolean) => void;
}) => {
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");

  const markdown = `
![](${url})
`;
  useEffect(() => {
    (async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Permission Checking" });
      exec(
        `security find-generic-password -D "AirPort network password" -a "${networkName}" -w`,
        async (error, password, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);

            toast.style = Toast.Style.Failure;
            toast.title = "Permission checked failed ❌";
            toast.message = error.message;

            setIsLoading(false);
            return;
          }
          QRCode.toDataURL(
            `WIFI:S:${networkName};T:WPA;P:${password.trim()};;`,
            {
              scale: 9,
              rendererOpts: { quality: 1 },
            },
            function (err, u) {
              setUrl(u);
            }
          );
          exec("open /Applications/Raycast.app", (error, stdout, stderr) => {
            toast.style = Toast.Style.Success;
            toast.title = "Permission checked successed ✅";

            setPassword(password.trim());
            setIsLoading(false);
          });
        }
      );
    })();
  }, []);

  return (
    <Detail
      navigationTitle="Wifi Share"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Wifi name" text={networkName} />
          <Detail.Metadata.TagList title="Password">
            <Detail.Metadata.TagList.Item text={password} color={"#eed535"} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
        </Detail.Metadata>
      }
    />
  );
};

export default function Command() {
  const [networks, setNetworks] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);

    exec("/usr/sbin/networksetup -listpreferredwirelessnetworks en0", (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        setIsLoading(false);
        return;
      }

      const lines = stdout.trim().split("\n");

      // Extract the Wi-Fi network names from the lines
      const networks = lines.slice(1).map((line) => line.trim());

      if (networks?.length > 0) {
        setNetworks(networks);
      }
      setIsLoading(false);
    });
  }, []);

  return (
    <List isLoading={isLoading}>
      {networks.map((network, index) => (
        <List.Item
          key={index}
          icon={Icon.Wifi}
          title={network}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.AppWindowSidebarRight}
                target={<DetailPassword networkName={network} setIsLoading={setIsLoading} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
