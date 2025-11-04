import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  connectionState,
  fetchInstances,
  instanceConnect,
  instanceDelete,
  instanceLogout,
  instanceRestart,
} from "./lib/api";
import { usePreferencesCheck } from "./lib/usePreferencesCheck";

type InstanceData = {
  id: string;
  name: string;
  connectionStatus: string;
  ownerJid: string | null;
  profileName: string | null;
  profilePicUrl: string | null;
  integration: string;
  number: string | null;
  businessId: string | null;
  token: string;
  clientName: string;
  disconnectionReasonCode: string | null;
  disconnectionObject: string | null;
  disconnectionAt: string | null;
  createdAt: string;
  updatedAt: string;
  Setting?: {
    id: string;
    rejectCall: boolean;
    msgCall: string;
    groupsIgnore: boolean;
    alwaysOnline: boolean;
    readMessages: boolean;
    readStatus: boolean;
    syncFullHistory: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function InstanceDetail({ instance }: { instance: InstanceData }) {
  const [qrCode, setQrCode] = useState<string>("");
  const [isLoadingQR, setIsLoadingQR] = useState(false);

  async function handleGetQRCode() {
    setIsLoadingQR(true);
    try {
      const response = (await instanceConnect(instance.name)) as { base64?: string; code?: string };
      console.log("QR Code response:", response);
      if (response.base64) {
        setQrCode(response.base64);
        await showToast({ style: Toast.Style.Success, title: "QR Code loaded" });
      } else if (response.code) {
        setQrCode(response.code);
        await showToast({ style: Toast.Style.Success, title: "Pairing code loaded" });
      } else {
        await showToast({ style: Toast.Style.Failure, title: "No QR code or pairing code received" });
      }
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to get QR code";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    } finally {
      setIsLoadingQR(false);
    }
  }

  const markdown = `
# ${instance.name}

## Status
**Connection:** ${instance.connectionStatus || "Unknown"}  
**Instance ID:** \`${instance.id}\`

${instance.ownerJid ? `**Owner:** ${instance.ownerJid}` : ""}
${instance.profileName ? `**Profile:** ${instance.profileName}` : ""}
${instance.number ? `**Number:** ${instance.number}` : ""}

## Integration
**Type:** ${instance.integration}  
**Client:** ${instance.clientName}  
${instance.token ? `**Token:** \`${instance.token.substring(0, 8)}...\`` : ""}

${instance.createdAt ? `**Created:** ${new Date(instance.createdAt).toLocaleString()}` : ""}

${
  qrCode
    ? qrCode.startsWith("data:image")
      ? `## QR Code\n\n![QR Code](${qrCode})\n\nScan this QR code with WhatsApp to connect.`
      : `## Pairing Code\n\n\`\`\`\n${qrCode}\n\`\`\`\n\nUse this code in WhatsApp: Link a Device > Link with phone number instead`
    : ""
}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={instance.name}
      isLoading={isLoadingQR}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={instance.connectionStatus || "Unknown"}
            icon={instance.connectionStatus === "open" ? Icon.CheckCircle : Icon.XMarkCircle}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Instance Name" text={instance.name} />
          <Detail.Metadata.Label title="Instance ID" text={instance.id} />
          {instance.ownerJid && <Detail.Metadata.Label title="Owner" text={instance.ownerJid} />}
          {instance.profileName && <Detail.Metadata.Label title="Profile Name" text={instance.profileName} />}
          {instance.number && <Detail.Metadata.Label title="Number" text={instance.number} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Integration" text={instance.integration} />
          <Detail.Metadata.Label title="Client" text={instance.clientName} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {!qrCode && instance.connectionStatus !== "open" && (
              <Action
                title="Get QR Code / Pairing Code"
                icon={Icon.Code}
                onAction={handleGetQRCode}
                shortcut={{ modifiers: ["cmd"], key: "q" }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Instance Name"
              content={instance.name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Instance ID"
              content={instance.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { isValid, isChecking } = usePreferencesCheck();
  const [instances, setInstances] = useState<InstanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadInstances() {
    setIsLoading(true);
    try {
      const data = (await fetchInstances()) as unknown;

      console.log("Raw API Response:", JSON.stringify(data, null, 2));
      console.log("Type of data:", typeof data);
      console.log("Is Array?:", Array.isArray(data));

      // According to docs, response is an array of { instance: {...} } objects
      let list: InstanceData[] = [];

      if (Array.isArray(data)) {
        console.log("Processing as array, length:", data.length);
        // The actual response format: array of instance objects directly
        list = data
          .map((item: unknown, index: number) => {
            console.log(`Item ${index}:`, item);

            // Check if item has the 'name' field (the actual structure)
            if (item && typeof item === "object" && "name" in item && "id" in item) {
              console.log(`Item ${index} is instance directly:`, item);
              return item as InstanceData;
            }
            return null;
          })
          .filter((inst): inst is InstanceData => inst !== null);
      } else if (data && typeof data === "object") {
        console.log("Processing as object");
        // Check if response might be wrapped differently
        const obj = data as Record<string, unknown>;
        console.log("Object keys:", Object.keys(obj));

        if (Array.isArray(obj.data)) {
          console.log("Found data array");
          list = obj.data as InstanceData[];
        } else if (Array.isArray(obj.instances)) {
          console.log("Found instances array");
          list = obj.instances as InstanceData[];
        } else if (obj.instance) {
          console.log("Found single instance");
          list = [obj.instance as InstanceData];
        }
      }

      console.log("Final parsed instances:", list);
      console.log("Number of instances:", list.length);
      setInstances(list);

      if (list.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: "No instances found",
          message: "Create a new instance to get started",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Instances loaded",
          message: `Found ${list.length} instance(s)`,
        });
      }
    } catch (e) {
      const error = e as { message?: string; status?: number };
      const message = error.message || "Failed to fetch instances";
      const details = error.status ? `Status: ${error.status} - ${message}` : message;
      console.error("Fetch instances error:", e);
      await showToast({ style: Toast.Style.Failure, title: "Error", message: details });
      setInstances([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isValid) {
      loadInstances();
    }
  }, [isValid]);

  async function handleRestart(name: string) {
    try {
      await instanceRestart(name);
      await showToast({ style: Toast.Style.Success, title: `Restarted: ${name}` });
      await loadInstances();
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to restart";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }

  async function handleLogout(name: string) {
    const confirmed = await confirmAlert({
      title: "Logout Instance",
      message: `Are you sure you want to logout ${name}?`,
      primaryAction: { title: "Logout", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await instanceLogout(name);
      await showToast({ style: Toast.Style.Success, title: `Logged out: ${name}` });
      await loadInstances();
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to logout";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }

  async function handleDelete(name: string) {
    const confirmed = await confirmAlert({
      title: "Delete Instance",
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await instanceDelete(name);
      await showToast({ style: Toast.Style.Success, title: `Deleted: ${name}` });
      await loadInstances();
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to delete";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }

  async function handleCheckStatus(name: string) {
    try {
      const state = await connectionState(name);
      await showToast({ style: Toast.Style.Success, title: "Connection State", message: JSON.stringify(state) });
    } catch (e) {
      const message = (e as { message?: string })?.message || "Failed to check status";
      await showToast({ style: Toast.Style.Failure, title: "Error", message });
    }
  }

  if (isChecking) {
    return <List isLoading={true} />;
  }

  if (!isValid) {
    return (
      <List>
        <List.EmptyView title="Configuration Required" description="Please configure your Evolution API settings" />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Manage Instances" searchBarPlaceholder="Search instances...">
      {instances.length === 0 && !isLoading ? (
        <List.EmptyView title="No instances found" description="Create an instance to get started" />
      ) : null}
      {instances.map((instance) => {
        const statusIcon =
          instance.connectionStatus === "open"
            ? Icon.CheckCircle
            : instance.connectionStatus === "close"
              ? Icon.XMarkCircle
              : Icon.Circle;
        const statusColor =
          instance.connectionStatus === "open"
            ? "#00FF00"
            : instance.connectionStatus === "close"
              ? "#FF0000"
              : "#FFAA00";

        return (
          <List.Item
            key={instance.id}
            title={instance.name}
            subtitle={instance.profileName || instance.ownerJid || instance.number || ""}
            accessories={[
              { tag: { value: instance.connectionStatus || "unknown", color: statusColor } },
              { text: instance.integration || "" },
            ]}
            icon={{ source: statusIcon, tintColor: statusColor }}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="View Details">
                  <Action.Push
                    title="View Details & Get QR"
                    icon={Icon.Eye}
                    target={<InstanceDetail instance={instance} />}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Instance Actions">
                  <Action
                    title="Restart"
                    icon={Icon.ArrowClockwise}
                    onAction={() => handleRestart(instance.name)}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Check Status"
                    icon={Icon.Eye}
                    onAction={() => handleCheckStatus(instance.name)}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Dangerous">
                  <Action
                    title="Logout"
                    icon={Icon.Logout}
                    onAction={() => handleLogout(instance.name)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(instance.name)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadInstances} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
