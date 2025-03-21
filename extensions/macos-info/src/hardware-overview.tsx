import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useExec, showFailureToast } from "@raycast/utils";

interface HardwareData {
  _name: string;
  activation_lock_status: string;
  boot_rom_version: string;
  chip_type: string;
  machine_model: string;
  machine_name: string;
  model_number: string;
  number_processors: string;
  os_loader_version: string;
  physical_memory: string;
  platform_UUID: string;
  provisioning_UDID: string;
  serial_number: string;
}

interface SystemProfilerResponse {
  SPHardwareDataType: [HardwareData];
}

function formatKey(key: string): string {
  switch (key) {
    case "activation_lock_status":
      return "Activation Lock Status";
    case "boot_rom_version":
      return "Boot ROM Version";
    case "chip_type":
      return "Chip Type";
    case "machine_model":
      return "Machine Model";
    case "machine_name":
      return "Machine Name";
    case "model_number":
      return "Model Number";
    case "number_processors":
      return "Number of Processors";
    case "os_loader_version":
      return "OS Loader Version";
    case "physical_memory":
      return "Physical Memory";
    case "platform_UUID":
      return "Platform UUID";
    case "provisioning_UDID":
      return "Provisioning UDID";
    case "serial_number":
      return "Serial Number";
    default:
      return key;
  }
}

function getIconForKey(key: string): string {
  switch (key) {
    case "_name":
      return "🖥️";
    case "machine_name":
      return "💻";
    case "machine_model":
      return "📱";
    case "model_number":
      return "🏷️";
    case "chip_type":
      return "🧠";
    case "physical_memory":
      return "💾";
    case "number_processors":
      return "⚙️";
    case "boot_rom_version":
      return "📊";
    case "os_loader_version":
      return "📲";
    case "serial_number":
      return "🔢";
    case "platform_UUID":
      return "🆔";
    case "provisioning_UDID":
      return "📝";
    case "activation_lock_status":
      return "🔒";
    default:
      return "ℹ️";
  }
}

export default function HardwareOverview() {
  const { data, isLoading } = useExec<SystemProfilerResponse>(
    "/usr/sbin/system_profiler",
    ["-json", "SPHardwareDataType"],
    {
      parseOutput: (output) => JSON.parse(output.stdout),
    },
  );

  const hardwareData = data?.SPHardwareDataType[0];

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
    <List isLoading={isLoading} searchBarPlaceholder="Search hardware information">
      <List.Section title="Hardware Overview">
        {hardwareData &&
          [
            ["machine_name", hardwareData.machine_name],
            ["machine_model", hardwareData.machine_model],
            ["model_number", hardwareData.model_number],
            ["chip_type", hardwareData.chip_type],
            ["number_processors", hardwareData.number_processors],
            ["physical_memory", hardwareData.physical_memory],
            ["boot_rom_version", hardwareData.boot_rom_version],
            ["os_loader_version", hardwareData.os_loader_version],
            ["serial_number", hardwareData.serial_number],
            ["platform_UUID", hardwareData.platform_UUID],
            ["provisioning_UDID", hardwareData.provisioning_UDID],
            ["activation_lock_status", hardwareData.activation_lock_status],
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
                      content={Object.entries(hardwareData)
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
