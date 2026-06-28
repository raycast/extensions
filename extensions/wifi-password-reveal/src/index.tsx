import { useState, useEffect } from "react";
import { ActionPanel, Detail, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { runPowerShellScript } from "@raycast/utils";
import { parseNetshWlanProfileEssentials, parseNetshWlanProfiles } from "./utils";

// Determine the operating system
const isWin = process.platform === "win32";
const isMacOs = process.platform === "darwin";

/** Escape a string for safe interpolation inside a PowerShell double-quoted string. */
function escapePowerShellString(value: string): string {
  return value
    .replace(/`/g, "``") // backtick (PS escape char) must come first
    .replace(/"/g, '`"') // double-quote
    .replace(/\$/g, "`$") // variable sigil
    .replace(/@\{/g, "`@{") // hashtable literal
    .replace(/@\(/g, "`@("); // array subexpression
}

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
          async (error, pw) => {
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
              setPassword(pw.trim());
              setIsLoading(false);
            });
          },
        );
      }

      if (isWin) {
        try {
          // runPowerShellScript uses PowerShell (not cmd.exe), so Unicode SSIDs and
          // special characters are handled correctly without shell-quoting pitfalls.
          const safeName = escapePowerShellString(networkName);
          const stdout = await runPowerShellScript(`netsh wlan show profile name="${safeName}" key=clear`);

          const networkInfo = parseNetshWlanProfileEssentials(stdout);

          if (networkInfo.error || !networkInfo.essentials) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to retrieve password ❌";
            toast.message = networkInfo.error?.message ?? "Could not parse network essentials.";
          } else {
            setPassword(networkInfo.essentials.keyContent);
            toast.style = Toast.Style.Success;
            toast.title = "Password retrieved successfully ✅";
          }
        } catch (error) {
          console.error(`runPowerShellScript error: ${error}`);
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
    setIsLoading(true);

    if (isMacOs) {
      exec("/usr/sbin/networksetup -listpreferredwirelessnetworks en0", (error, stdout) => {
        if (error) {
          console.error(`exec error: ${error}`);
          setIsLoading(false);
          return;
        }

        const lines = stdout.trim().split("\n");
        const networks = lines.slice(1).map((line) => line.trim());

        if (networks?.length > 0) {
          setNetworks(networks);
        }
        setIsLoading(false);
      });
    }

    if (isWin) {
      (async () => {
        try {
          const stdout = await runPowerShellScript(`netsh wlan show profiles`);
          const networks = parseNetshWlanProfiles(stdout);

          if (networks?.length > 0) {
            setNetworks(networks);
          }
        } catch (error) {
          console.error(`runPowerShellScript error: ${error}`);
        } finally {
          setIsLoading(false);
        }
      })();
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
