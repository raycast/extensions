import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useExec, showFailureToast } from "@raycast/utils";

interface SoftwareData {
  _name: string;
  boot_mode: string;
  boot_volume: string;
  kernel_version: string;
  local_host_name: string;
  os_version: string;
  secure_vm: string;
  system_integrity: string;
  uptime: string;
  user_name: string;
}

interface SystemProfilerResponse {
  SPSoftwareDataType: [SoftwareData];
}

function formatKey(key: string): string {
  switch (key) {
    case "boot_mode":
      return "Boot Mode";
    case "boot_volume":
      return "Boot Volume";
    case "kernel_version":
      return "Kernel Version";
    case "local_host_name":
      return "Local Host Name";
    case "os_version":
      return "OS Version";
    case "secure_vm":
      return "Secure VM";
    case "system_integrity":
      return "System Integrity";
    case "uptime":
      return "Uptime";
    case "user_name":
      return "User Name";
    default:
      return key;
  }
}

function getIconForKey(key: string): string {
  switch (key) {
    case "os_version":
      return "🍎";
    case "kernel_version":
      return "⚙️";
    case "boot_mode":
      return "🔄";
    case "boot_volume":
      return "💾";
    case "secure_vm":
      return "🔒";
    case "system_integrity":
      return "🛡️";
    case "local_host_name":
      return "🏠";
    case "user_name":
      return "👤";
    case "uptime":
      return "⏱️";
    default:
      return "ℹ️";
  }
}

export default function SoftwareOverview() {
  const { data, isLoading } = useExec<SystemProfilerResponse>(
    "/usr/sbin/system_profiler",
    ["-json", "SPSoftwareDataType"],
    {
      parseOutput: (output) => JSON.parse(output.stdout),
    },
  );

  const softwareData = data?.SPSoftwareDataType[0];

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await showToast({
        style: Toast.Style.Success,
        title: `Copied ${label}`,
        message: value,
      });
    } catch (error) {
      showFailureToast({ title: "Failed to copy", message: String(error) });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search software information">
      <List.Section title="Software Overview">
        {softwareData &&
          [
            ["boot_mode", softwareData.boot_mode],
            ["boot_volume", softwareData.boot_volume],
            ["kernel_version", softwareData.kernel_version],
            ["local_host_name", softwareData.local_host_name],
            ["os_version", softwareData.os_version],
            ["secure_vm", softwareData.secure_vm],
            ["system_integrity", softwareData.system_integrity],
            ["uptime", softwareData.uptime],
            ["user_name", softwareData.user_name],
          ]
            .filter(([key]) => key !== "_name") // Skip the _name property which isn't useful to display
            .map(([key, value]) => (
              <List.Item
                key={key}
                title={formatKey(key)}
                subtitle={value as string}
                icon={getIconForKey(key)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title={`Copy ${formatKey(key)}`}
                      content={value as string}
                      onCopy={() => copyToClipboard(value as string, formatKey(key))}
                    />
                    <Action.CopyToClipboard
                      title="Copy All Information"
                      content={Object.entries(softwareData)
                        .filter(([k]) => k !== "_name")
                        .map(([k, v]) => `${formatKey(k)}: ${v}`)
                        .join("\n")}
                    />
                  </ActionPanel>
                }
              />
            ))}
      </List.Section>
    </List>
  );
}
