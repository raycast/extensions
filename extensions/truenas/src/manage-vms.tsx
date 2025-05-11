import React from "react";
import { showToast, Toast, getPreferenceValues, List, ActionPanel, Action } from "@raycast/api";
import https from "https";
import fetch from "node-fetch";

// Define the TrueNAS API base URL
const preferences = getPreferenceValues<{
  apiUrl: string;
  apiKey: string;
  rejectUnauthorized: boolean;
}>();

const API_URL = preferences.apiUrl;
const API_KEY = preferences.apiKey;
const REJECT_UNAUTHORIZED = preferences.rejectUnauthorized;
const TRUENAS_API_BASE_URL = `${API_URL}/api/v2.0`;

const agent = new https.Agent({
  rejectUnauthorized: REJECT_UNAUTHORIZED,
});

// Function to fetch the list of VMs
async function fetchVMs(): Promise<object[]> {
  const url = `${TRUENAS_API_BASE_URL}/vm`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      agent,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch VMs: ${response.statusText}`);
    }

    return (await response.json()) as object[];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    showToast({ style: Toast.Style.Failure, title: `Error`, message: errorMessage });
    return [];
  }
}

// Function to manage virtual machines
async function manageVM(action: "start" | "stop", vmId: string, state: string) {
  if (state === "RUNNING" && action === "start") {
    showToast({ style: Toast.Style.Failure, title: `VM is already running` });
    return;
  } else if (state === "STOPPED" && action === "stop") {
    showToast({ style: Toast.Style.Failure, title: `VM is already stopped` });
    return;
  }
  const url = `${TRUENAS_API_BASE_URL}/vm/id/${vmId}/${action}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      agent,
    });

    if (!response.ok) {
      throw new Error(`Failed to ${action} VM: ${response.statusText}`);
    }

    showToast({
      style: Toast.Style.Success,
      title: action === "start" ? `VM started successfully` : `VM stopped successfully`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    showToast({ style: Toast.Style.Failure, title: `Error`, message: errorMessage });
  }
}

// Function to restart a virtual machine
// This function first stops the VM and then starts it again after a delay
// Note: The delay is set to 5 seconds (5000 milliseconds) in this example
async function restartVM(vmId: string, state: string) {
  if (state === "STOPPED") {
    showToast({ style: Toast.Style.Failure, title: `VM is stopped` });
    return;
  }
  manageVM("stop", vmId, state);
  setTimeout(() => {
    manageVM("start", vmId, state);
  }, 5000);
}

// Main command
export default function Command() {
  const [vms, setVMs] = React.useState<object[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadVMs() {
      const vmList: object[] = await fetchVMs();
      setVMs(vmList);
      setIsLoading(false);
    }

    loadVMs();
  }, []);

  return (
    <List isLoading={isLoading}>
      {vms.map((vm) => (
        <List.Item
          key={vm.id}
          title={vm.name}
          subtitle={`Status: ${vm.status.state}`}
          actions={
            <ActionPanel>
              <Action title="Start Vm" onAction={() => manageVM("start", vm.id, vm.status.state)} />
              <Action title="Stop Vm" onAction={() => manageVM("stop", vm.id, vm.status.state)} />
              <Action title="Restart Vm" onAction={() => restartVM(vm.id, vm.status.state)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
