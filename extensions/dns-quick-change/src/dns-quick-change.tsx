import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Keyboard,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Form,
  getPreferenceValues,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import * as net from "net";
import {
  DNSPreset,
  NetworkInfo,
  getActiveNetworkService,
  getNetworkInterfaceForService,
  getPresets,
  getPreset,
  addPreset,
  deletePreset,
  getNetworkInterfaceDetails,
  getNetworkInfo,
  setDNSFromPreset,
  resetDNS,
  validateNetworkServiceName,
  validateServers,
  DEFAULT_NETWORK_SERVICE,
  DEFAULT_NETWORK_INTERFACE,
} from "./dns-utils";

let NETWORK_SERVICE = DEFAULT_NETWORK_SERVICE;
let NETWORK_INTERFACE = DEFAULT_NETWORK_INTERFACE;

/**
 * List view showing all network interface info — press Enter on any row to copy.
 */
function NetworkDetailsView({ service, device }: { service: string; device: string }) {
  const [details, setDetails] = useState<{ [key: string]: string }>({});
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const [fetchedDetails, fetchedNetworkInfo] = await Promise.all([
          getNetworkInterfaceDetails(service, device),
          getNetworkInfo(service),
        ]);
        if (!isCancelled) {
          setDetails(fetchedDetails);
          setNetworkInfo(fetchedNetworkInfo);
        }
      } catch (error) {
        console.error("Failed to fetch network details:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [service, device]);

  // Helper to safely pull a value from the networksetup -getinfo output
  const get = (key: string): string | undefined => {
    const val = details[key]?.trim();
    if (!val || val.toLowerCase() === "none") {
      return undefined;
    }
    return val;
  };

  const InfoItem = ({
    icon,
    title,
    value,
    extraActions,
  }: {
    icon: Icon;
    title: string;
    value: string;
    extraActions?: React.ReactNode;
  }) => (
    <List.Item
      icon={icon}
      title={title}
      accessories={[{ text: value }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title={`Copy ${title}`} content={value} />
            {extraActions}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  const activeDNS = networkInfo?.activeDNS.join(", ") || "";

  if (isLoading) {
    return <List navigationTitle={`${service} Details`} isLoading={true} />;
  }

  return (
    <List navigationTitle={`${service} Details`} searchBarPlaceholder="Search network info...">
      {/* DNS Section */}
      <List.Section title="DNS">
        <List.Item
          icon={{
            source: networkInfo?.isDHCP ? Icon.Globe : Icon.Lock,
            tintColor: networkInfo?.isDHCP ? Color.Blue : Color.Orange,
          }}
          title="DNS Source"
          accessories={[
            {
              tag: {
                value: networkInfo?.isUnknown ? "Unknown" : networkInfo?.isDHCP ? "DHCP" : "Manual",
                color: networkInfo?.isUnknown ? Color.SecondaryText : networkInfo?.isDHCP ? Color.Blue : Color.Orange,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy DNS Source"
                content={networkInfo?.isUnknown ? "Unknown" : networkInfo?.isDHCP ? "DHCP" : "Manual"}
              />
            </ActionPanel>
          }
        />
        {activeDNS && <InfoItem icon={Icon.Network} title="Active DNS Servers" value={activeDNS} />}
      </List.Section>

      {/* Interface Details Section */}
      <List.Section title="Interface Details">
        <InfoItem icon={Icon.ComputerChip} title="Network Service" value={service} />
        {device && <InfoItem icon={Icon.HardDrive} title="BSD Device" value={device} />}
        {get("IP address") && <InfoItem icon={Icon.Globe} title="IP Address" value={get("IP address")!} />}
        {get("Subnet mask") && <InfoItem icon={Icon.Layers} title="Subnet Mask" value={get("Subnet mask")!} />}
        {get("Router") && (
          <InfoItem
            icon={Icon.Wifi}
            title="Router"
            value={get("Router")!}
            extraActions={
              net.isIP(get("Router")!) ? (
                <Action.OpenInBrowser title="Open Router in Browser" url={`http://${get("Router")}`} />
              ) : undefined
            }
          />
        )}
        {get("IPv6 IP address") && <InfoItem icon={Icon.Globe} title="IPv6 Address" value={get("IPv6 IP address")!} />}
        {get("IPv6 Router") && <InfoItem icon={Icon.Wifi} title="IPv6 Router" value={get("IPv6 Router")!} />}
        {get("MAC Address") && <InfoItem icon={Icon.Fingerprint} title="MAC Address" value={get("MAC Address")!} />}
        {get("Wi-Fi ID") && <InfoItem icon={Icon.Wifi} title="Wi-Fi ID" value={get("Wi-Fi ID")!} />}
        {get("Ethernet Address") && (
          <InfoItem icon={Icon.Link} title="Ethernet Address" value={get("Ethernet Address")!} />
        )}
      </List.Section>

      {/* IPv6 Section */}
      {(get("IPv6") || get("IPv6 IP address") || get("IPv6 Router")) && (
        <List.Section title="IPv6">
          {get("IPv6") && <InfoItem icon={Icon.Network} title="IPv6 Configuration" value={get("IPv6")!} />}
          {get("IPv6 IP address") && (
            <InfoItem icon={Icon.Globe} title="IPv6 Address" value={get("IPv6 IP address")!} />
          )}
          {get("IPv6 Router") && (
            <InfoItem
              icon={Icon.Wifi}
              title="IPv6 Router"
              value={get("IPv6 Router")!}
              extraActions={
                net.isIP(get("IPv6 Router")!) ? (
                  <Action.OpenInBrowser title="Open Router in Browser" url={`http://[${get("IPv6 Router")}]`} />
                ) : undefined
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}

/**
 * Form to add or edit a DNS preset
 */
function AddEditPresetForm({ existing, onSaved }: { existing?: DNSPreset; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [serversError, setServersError] = useState<string | undefined>();
  const isEditing = !!existing;

  function validateName(value: string | undefined): string | undefined {
    if (!value || value.trim().length === 0) return "Name is required";
    if (/[=\s]/.test(value)) return "Name cannot contain spaces or '='";
    const trimmed = value.trim();
    // Disallow existing name unless editing and keeping the same name
    try {
      if ((!isEditing || trimmed !== existing?.name) && getPreset(trimmed)) {
        return `Preset "${trimmed}" already exists`;
      }
    } catch (error) {
      return error instanceof Error ? error.message : "Could not read saved presets";
    }
    return undefined;
  }

  async function handleSubmit(values: { name: string; servers: string; description?: string }) {
    const trimmedName = values.name.trim();
    const serverParts = values.servers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const trimmedServers = serverParts.join(",");
    const trimmedDescription = values.description?.trim();

    const nameErr = validateName(trimmedName);
    const serversErr = validateServers(values.servers);

    setNameError(nameErr);
    setServersError(serversErr);

    if (nameErr || serversErr) {
      return;
    }

    try {
      // Save new/renamed preset first before deleting old one to prevent data loss if write fails
      addPreset(trimmedName, trimmedServers, trimmedDescription);
      if (isEditing && existing && existing.name !== trimmedName) {
        const oldName = existing.name;
        try {
          deletePreset(oldName);
        } catch (cleanupErr) {
          console.error("Failed to delete old preset during rename:", cleanupErr);
          onSaved();
          const detail = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
          await showToast({
            style: Toast.Style.Failure,
            title: `Could not remove "${oldName}"`,
            message: `"${trimmedName}" was saved. ${detail}`,
            primaryAction: {
              title: "Remove Old Preset",
              onAction: async () => {
                try {
                  deletePreset(oldName);
                  onSaved();
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Removed "${oldName}"`,
                  });
                } catch (retryErr) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: `Could not remove "${oldName}"`,
                    message: retryErr instanceof Error ? retryErr.message : String(retryErr),
                  });
                }
              },
            },
          });
          pop();
          return;
        }
      }
      await showToast({
        style: Toast.Style.Success,
        title: isEditing ? `Updated "${trimmedName}"` : `Added "${trimmedName}"`,
        message: trimmedServers,
      });
      onSaved();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save preset",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? `Edit "${existing.name}"` : "Add DNS Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Save Changes" : "Add Preset"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Preset Name"
        placeholder="e.g. cloudflare, home, work"
        autoFocus
        defaultValue={existing?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="servers"
        title="DNS Servers"
        placeholder="1.1.1.1, 1.0.0.1 or 2606:4700:4700::1111"
        info="Comma-separated list of IPv4 or IPv6 addresses"
        defaultValue={existing?.servers}
        error={serversError}
        onChange={() => setServersError(undefined)}
      />
      <Form.TextField
        id="description"
        title="Description"
        placeholder="e.g. Fast & private, no logging (optional)"
        defaultValue={existing?.description}
      />
    </Form>
  );
}

export default function Command() {
  const [presets, setPresets] = useState<DNSPreset[]>([]);
  const [presetsError, setPresetsError] = useState<string | undefined>();
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [networkService, setNetworkService] = useState<string>(NETWORK_SERVICE);
  const [networkInterface, setNetworkInterface] = useState<string>(NETWORK_INTERFACE);
  const [isServiceResolved, setIsServiceResolved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  async function resolveService(): Promise<{ service: string; device: string }> {
    try {
      const prefs = getPreferenceValues<Preferences>();
      if (prefs.networkService && prefs.networkService.trim() !== "") {
        const trimmedService = prefs.networkService.trim();
        // Validate service name before using it
        if (validateNetworkServiceName(trimmedService)) {
          const device = (await getNetworkInterfaceForService(trimmedService)) ?? DEFAULT_NETWORK_INTERFACE;
          NETWORK_SERVICE = trimmedService;
          NETWORK_INTERFACE = device;
          return { service: trimmedService, device };
        } else {
          throw new Error(
            `Invalid network service name in preferences: "${trimmedService}". Falling back to auto-detect.`,
          );
        }
      }
    } catch (error) {
      console.error("Network service preference error:", error);
    }

    const detected = await getActiveNetworkService();
    NETWORK_SERVICE = detected.service;
    NETWORK_INTERFACE = detected.device;
    return detected;
  }

  async function ensureActiveService(): Promise<{ service: string; device: string }> {
    if (isServiceResolved && networkService) {
      return { service: networkService, device: networkInterface };
    }
    const resolved = await resolveService();
    setNetworkService(resolved.service);
    setNetworkInterface(resolved.device);
    setIsServiceResolved(true);
    return resolved;
  }

  async function refresh(resolved?: { service: string; device: string }) {
    const currentId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      let target = resolved;

      if (!target) {
        if (isServiceResolved && networkService) {
          target = { service: networkService, device: networkInterface };
        } else {
          const detected = await resolveService();
          target = detected;
          if (currentId === requestIdRef.current) {
            setNetworkService(detected.service);
            setNetworkInterface(detected.device);
            setIsServiceResolved(true);
          }
        }
      }

      let loadedPresets: DNSPreset[] = [];
      let presetLoadError: string | undefined;
      try {
        loadedPresets = getPresets();
      } catch (error) {
        presetLoadError = error instanceof Error ? error.message : String(error);
      }
      const loadedInfo = await getNetworkInfo(target.service);
      if (currentId === requestIdRef.current) {
        setNetworkService(target.service);
        setNetworkInterface(target.device);
        setIsServiceResolved(true);
        setPresets(loadedPresets);
        setPresetsError(presetLoadError);
        setNetworkInfo(loadedInfo);
      }
    } catch (error) {
      if (currentId === requestIdRef.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load DNS info",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (currentId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    let isCancelled = false;

    async function init() {
      const currentId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const { service, device } = await resolveService();
        let loadedPresets: DNSPreset[] = [];
        let presetLoadError: string | undefined;
        try {
          loadedPresets = getPresets();
        } catch (error) {
          presetLoadError = error instanceof Error ? error.message : String(error);
        }
        const loadedInfo = await getNetworkInfo(service);

        if (!isCancelled && currentId === requestIdRef.current) {
          setNetworkService(service);
          setNetworkInterface(device);
          setIsServiceResolved(true);
          setPresets(loadedPresets);
          setPresetsError(presetLoadError);
          setNetworkInfo(loadedInfo);
        }
      } catch (error) {
        if (!isCancelled && currentId === requestIdRef.current) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load DNS info",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (!isCancelled && currentId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleSetPreset(preset: DNSPreset) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Setting DNS to ${preset.name}...`,
      });
      const activeService = await ensureActiveService();
      await setDNSFromPreset(preset.name, activeService.service);
      await showToast({
        style: Toast.Style.Success,
        title: `DNS set to ${preset.name}`,
        message: preset.servers,
      });
      await refresh(activeService);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set DNS",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleReset() {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Resetting DNS to DHCP...",
      });
      const activeService = await ensureActiveService();
      await resetDNS(activeService.service);
      await showToast({
        style: Toast.Style.Success,
        title: "DNS reset to DHCP",
      });
      await refresh(activeService);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to reset DNS",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDelete(preset: DNSPreset) {
    const options: Alert.Options = {
      title: `Delete "${preset.name}"?`,
      message: `Are you sure you want to remove the preset "${preset.name}" (${preset.servers})?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        deletePreset(preset.name);
        await showToast({
          style: Toast.Style.Success,
          title: `Deleted "${preset.name}"`,
        });
        await refresh();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete preset",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const activeDNSText = networkInfo?.activeDNS.length ? networkInfo.activeDNS.join(", ") : "None detected";
  const dnsSourceTag = !networkInfo
    ? "Detecting"
    : networkInfo.isUnknown
      ? "Unknown"
      : networkInfo.isDHCP
        ? "DHCP"
        : "Manual";
  const dnsSourceColor =
    !networkInfo || networkInfo.isUnknown ? Color.SecondaryText : networkInfo.isDHCP ? Color.Blue : Color.Orange;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search presets or IP addresses...">
      <List.EmptyView
        icon={Icon.Network}
        title="No Presets Found"
        description="Add a DNS preset to quickly toggle nameservers or reset to DHCP."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add DNS Preset"
              icon={Icon.Plus}
              target={<AddEditPresetForm onSaved={() => refresh()} />}
            />
            {isServiceResolved && <Action title="Reset to DHCP" icon={Icon.XMarkCircle} onAction={handleReset} />}
          </ActionPanel>
        }
      />

      {/* Network Interface — click for full details */}
      <List.Section title="Current Connection">
        <List.Item
          icon={{
            source: !networkInfo ? Icon.CircleProgress : networkInfo.isDHCP ? Icon.Globe : Icon.Lock,
            tintColor: dnsSourceColor,
          }}
          title="Active Network Service"
          subtitle={networkInfo?.service ?? "Detecting..."}
          accessories={[
            ...(networkInfo ? [{ text: activeDNSText }] : []),
            {
              tag: {
                value: dnsSourceTag,
                color: dnsSourceColor,
              },
            },
            ...(isServiceResolved && networkInterface ? [{ tag: networkInterface }] : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Network Details">
                {isServiceResolved && (
                  <Action.Push
                    title="Show Network Details"
                    icon={Icon.Info}
                    target={<NetworkDetailsView service={networkService} device={networkInterface} />}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Active DNS"
                  content={activeDNSText}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Network Controls">
                {isServiceResolved && (
                  <Action
                    title="Reset to DHCP"
                    icon={Icon.XMarkCircle}
                    onAction={handleReset}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                )}
                <Action
                  title="Refresh Network Info"
                  icon={Icon.ArrowClockwise}
                  onAction={() => refresh()}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                />
                <Action title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Quick Actions */}
      <List.Section title="Quick Actions">
        <List.Item
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          title="Add DNS Preset"
          subtitle="Create a new preset to quickly switch to"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Preset"
                icon={Icon.Plus}
                target={<AddEditPresetForm onSaved={() => refresh()} />}
              />
            </ActionPanel>
          }
        />
        {isServiceResolved && (
          <List.Item
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Orange }}
            title="Reset to DHCP"
            subtitle="Remove manual DNS and use automatic settings"
            actions={
              <ActionPanel>
                <Action
                  title="Reset to DHCP"
                  icon={Icon.XMarkCircle}
                  onAction={handleReset}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {/* Presets List */}
      <List.Section title="DNS Presets">
        {presetsError && (
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Could not read saved presets"
            subtitle={presetsError}
          />
        )}
        {presets.map((preset) => {
          const serverArray = preset.servers.split(",").map((s) => s.trim());
          const isActive =
            networkInfo &&
            !networkInfo.isDHCP &&
            serverArray.length === networkInfo.manualDNS.length &&
            serverArray.every((server) => networkInfo.manualDNS.includes(server));

          const accessories: List.Item.Accessory[] = [];
          if (preset.description) {
            accessories.push({ text: preset.servers });
          }
          if (isActive) {
            accessories.push({ tag: { value: "Active", color: Color.Green } });
          }

          return (
            <List.Item
              key={preset.name}
              icon={{
                source: isActive ? Icon.CheckCircle : Icon.Circle,
                tintColor: isActive ? Color.Green : Color.SecondaryText,
              }}
              title={preset.name}
              subtitle={preset.description || preset.servers}
              keywords={[...serverArray, ...(preset.description ? preset.description.split(" ") : [])]}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Apply">
                    {isServiceResolved && (
                      <Action
                        title={`Set DNS to ${preset.name}`}
                        icon={Icon.Network}
                        onAction={() => handleSetPreset(preset)}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy DNS Servers"
                      content={preset.servers}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Preset Name"
                      content={preset.name}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage Presets">
                    <Action.Push
                      title="Edit Preset"
                      icon={Icon.Pencil}
                      target={<AddEditPresetForm existing={preset} onSaved={() => refresh()} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <Action.Push
                      title="Add New Preset"
                      icon={Icon.Plus}
                      target={<AddEditPresetForm onSaved={() => refresh()} />}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action
                      title="Delete Preset"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(preset)}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Network">
                    {isServiceResolved && (
                      <Action.Push
                        title="Show Network Details"
                        icon={Icon.Info}
                        target={<NetworkDetailsView service={networkService} device={networkInterface} />}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                      />
                    )}
                    {isServiceResolved && (
                      <Action
                        title="Reset to DHCP"
                        icon={Icon.XMarkCircle}
                        onAction={handleReset}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    )}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => refresh()}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
