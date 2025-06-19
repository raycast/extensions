import { useState, useEffect } from "react";
import { ActionPanel, Detail, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { parseNetshWlanProfileEssentials, parseNetshWlanProfiles } from "./utils";

// Determine the operating system
const isWin = process.platform === "win32";
const isMacOs = process.platform === "darwin";

const DetailPassword = ({
  networkName,
  setIsLoading,
}: {
  networkName: string;
  setIsLoading: (loading: boolean) => void;
}) => {
  const [password, setPassword] = useState("");

  useEffect(() => {
    (async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching Wi-Fi Password" });
      setIsLoading(true);

      if (isMacOs) {
        exec(
          `security find-generic-password -D "AirPort network password" -a "${networkName}" -w`,
          async (error, password) => {
            if (error) {
              console.error(`exec error: ${error}`);
              toast.style = Toast.Style.Failure;
              toast.title = "Failed to retrieve password ❌";
              toast.message = error.message;
              setIsLoading(false);
              return;
            }

            // Trigger open raycast app
            exec("open /Applications/Raycast.app", () => {
              toast.style = Toast.Style.Success;
              toast.title = "Password retrieved successfully ✅";
              setPassword(password.trim());
              setIsLoading(false);
            });
          },
        );
      }

      if (isWin) {
        exec(`netsh wlan show profile name="${networkName}" key=clear`, async (error, stdout) => {
          if (error) {
            console.error(`exec error: ${error}`);
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to retrieve password ❌";
            toast.message = error.message;
            setIsLoading(false);
            return;
          }

          const networkInfo = parseNetshWlanProfileEssentials(stdout);

          if (networkInfo.error || !networkInfo.essentials) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to retrieve password ❌";
            toast.message = networkInfo.error?.message || "Could not parse network essentials.";
          } else {
            setPassword(networkInfo.essentials.keyContent);
            toast.style = Toast.Style.Success;
            toast.title = "Password retrieved successfully ✅";
          }
          setIsLoading(false);
        });
      }
    })();
  }, [networkName]);

  return (
    <Detail
      markdown={`
## Wifi Name 📶
${networkName}
## Password 🔑
${password}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={password} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    />
  );
};

export default function Command() {
  const [networks, setNetworks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    if (isMacOs) {
      exec("/usr/sbin/networksetup -listpreferredwirelessnetworks en0", (error, stdout) => {
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
    }

    if (isWin) {
      exec("netsh wlan show profiles", (error, stdout) => {
        if (error) {
          console.error(`exec error: ${error}`);
          setIsLoading(false);
          return;
        }

        const networks = parseNetshWlanProfiles(stdout.trim());

        if (networks?.length > 0) {
          setNetworks(networks);
        }
        setIsLoading(false);
      });
    }
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
                target={<DetailPassword networkName={network} setIsLoading={setIsLoading} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
