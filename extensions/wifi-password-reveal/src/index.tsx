import { useState, useEffect } from "react";
import { ActionPanel, Detail, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { parseNetshWlanProfileEssentials, parseNetshWlanProfiles, parseWifiInterface } from "./utils";

const execFileAsync = promisify(execFile);
const NETSH = "C:\\Windows\\System32\\netsh.exe";

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
        try {
          // execFile avoids shell interpretation — networkName is passed as a literal
          // argument, so SSIDs with quotes, $, backticks, etc. are safe.
          const { stdout: pw } = await execFileAsync("/usr/bin/security", [
            "find-generic-password",
            "-D",
            "AirPort network password",
            "-a",
            networkName,
            "-w",
          ]);

          // Bring Raycast back into focus after the keychain approval dialog
          // (fire-and-forget; we don't need to wait for it).
          execFile("/usr/bin/open", ["-a", "Raycast"], () => {});

          toast.style = Toast.Style.Success;
          toast.title = "Password retrieved successfully ✅";
          setPassword(pw.trim());
        } catch (error) {
          console.error(`security error: ${error}`);
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to retrieve password ❌";
          toast.message = error instanceof Error ? error.message : String(error);
        } finally {
          setIsLoading(false);
        }
      }

      if (isWin) {
        try {
          const { stdout } = await execFileAsync(
            NETSH,
            ["wlan", "show", "profile", `name=${networkName}`, "key=clear"],
            { windowsHide: true },
          );

          const networkInfo = parseNetshWlanProfileEssentials(stdout);

          if (networkInfo.error) {
            const titleMap: Record<typeof networkInfo.error.code, string> = {
              PermissionDenied: "Insufficient permissions ❌",
              EnterpriseNetwork: "Enterprise network ❌",
              ProfileNotFound: "Profile not found ❌",
              Unknown: "Failed to retrieve password ❌",
            };
            toast.style = Toast.Style.Failure;
            toast.title = titleMap[networkInfo.error.code];
            toast.message = networkInfo.error.message ?? "Could not parse network essentials.";
          } else if (!networkInfo.essentials) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to retrieve password ❌";
            toast.message = "Could not parse network essentials.";
          } else if (networkInfo.essentials.isOpenNetwork) {
            setPassword("(open network — no password)");
            toast.style = Toast.Style.Success;
            toast.title = "Open network — no password set ✅";
          } else {
            setPassword(networkInfo.essentials.keyContent);
            toast.style = Toast.Style.Success;
            toast.title = "Password retrieved successfully ✅";
          }
        } catch (error) {
          console.error(`netsh error: ${error}`);
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to retrieve password ❌";
          toast.message = error instanceof Error ? error.message : String(error);
        } finally {
          setIsLoading(false);
        }
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
    (async () => {
      setIsLoading(true);

      if (isMacOs) {
        try {
          // Detect the active Wi-Fi interface (usually en0, but may be en1 or
          // another device on Macs with USB adapters or multiple radios).
          let iface = "en0";
          try {
            const { stdout: hwPorts } = await execFileAsync("/usr/sbin/networksetup", ["-listallhardwareports"]);
            iface = parseWifiInterface(hwPorts);
          } catch {
            // Non-fatal — keep the en0 fallback.
          }

          const { stdout } = await execFileAsync("/usr/sbin/networksetup", ["-listpreferredwirelessnetworks", iface]);

          const lines = stdout.trim().split("\n");
          const discovered = lines
            .slice(1)
            .map((line) => line.trim())
            .filter(Boolean);
          if (discovered.length > 0) {
            setNetworks(discovered);
          }
        } catch (error) {
          console.error(`networksetup error: ${error}`);
        } finally {
          setIsLoading(false);
        }
      }

      if (isWin) {
        try {
          const { stdout } = await execFileAsync(NETSH, ["wlan", "show", "profiles"], { windowsHide: true });
          const discovered = parseNetshWlanProfiles(stdout);
          if (discovered.length > 0) {
            setNetworks(discovered);
          }
        } catch (error) {
          console.error(`netsh error: ${error}`);
        } finally {
          setIsLoading(false);
        }
      }
    })();
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
                icon={Icon.Info}
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
