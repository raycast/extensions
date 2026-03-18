import { AdvancedSettingsState, DashboardState, ExitNode, NetcheckResult, PeerNode, ServiceStatus } from "../types";

function renderKeyValue(label: string, value?: string | number | boolean): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return `- **${label}:** ${String(value)}`;
}

function renderList(label: string, values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  return `- **${label}:** ${values.join(", ")}`;
}

export function renderDeviceDetail(state: DashboardState): string {
  const self = state.self;

  if (!self) {
    return [
      "# Tailscale",
      "",
      renderKeyValue("Backend State", state.backendState),
      renderKeyValue("Login URL", state.authUrl),
    ]
      .filter(Boolean)
      .join("\n");
  }

  const sections = [
    `# ${self.hostName}`,
    "",
    "## Overview",
    renderKeyValue("Backend State", state.backendState),
    renderKeyValue("Connection", state.connectionState),
    renderKeyValue("Tailnet", self.tailnetName),
    renderKeyValue("MagicDNS", self.dnsName),
    renderList("Tailscale IPs", self.ips),
    renderKeyValue("Relay", self.relay),
    renderKeyValue("Current Exit Node", self.currentExitNodeName),
    renderKeyValue("Key Expiry", self.keyExpiry),
    "",
    "## Health",
    state.health.length > 0 ? state.health.map((item) => `- ${item.text}`).join("\n") : "- No health messages",
  ];

  return sections.filter(Boolean).join("\n");
}

export function renderPeerDetail(peer: PeerNode): string {
  const sections = [
    `# ${peer.hostName}`,
    "",
    renderKeyValue("Online", peer.online ? "Yes" : "No"),
    renderKeyValue("MagicDNS", peer.dnsName),
    renderKeyValue("OS", peer.os),
    renderList("Tailscale IPs", peer.ips),
    renderKeyValue("Relay", peer.relay),
    renderKeyValue("Last Seen", peer.lastSeen),
    renderKeyValue("Exit Node Candidate", peer.exitNodeOption ? "Yes" : "No"),
    renderKeyValue("Current Exit Node", peer.exitNode ? "Yes" : "No"),
    renderKeyValue("Taildrop", peer.noFileSharingReason ? `Unavailable (${peer.noFileSharingReason})` : "Available"),
  ];

  return sections.filter(Boolean).join("\n");
}

export function renderExitNodeDetail(exitNode: ExitNode): string {
  const sections = [
    `# ${exitNode.title}`,
    "",
    renderKeyValue("Identifier", exitNode.id),
    renderKeyValue("Status", exitNode.selected ? "Currently selected" : "Available"),
    renderKeyValue("Details", exitNode.subtitle),
  ];

  return sections.filter(Boolean).join("\n");
}

export function renderNetcheckDetail(netcheck?: NetcheckResult): string {
  if (!netcheck) {
    return ["# Netcheck", "", "Run a netcheck from the action panel to inspect current network conditions."].join("\n");
  }

  return ["# Netcheck", "", renderKeyValue("Last Run", netcheck.ranAt), "", "```text", netcheck.output, "```"]
    .filter(Boolean)
    .join("\n");
}

export function renderAdvancedSettingDetail(
  title: string,
  description: string,
  enabled: boolean,
  settings?: AdvancedSettingsState,
): string {
  const sections = [`# ${title}`, "", description, "", renderKeyValue("Status", enabled ? "Enabled" : "Disabled")];

  if (settings) {
    sections.push("", "## Current Advanced Settings");
    sections.push(renderKeyValue("Accept DNS", settings.acceptDns ? "Enabled" : "Disabled"));
    sections.push(renderKeyValue("Accept Routes", settings.acceptRoutes ? "Enabled" : "Disabled"));
    sections.push(renderKeyValue("Tailscale SSH", settings.ssh ? "Enabled" : "Disabled"));
    sections.push(renderKeyValue("Web Client", settings.webClient ? "Enabled" : "Disabled"));
    sections.push(renderKeyValue("Shields Up", settings.shieldsUp ? "Enabled" : "Disabled"));
    sections.push(renderKeyValue("Exit Node LAN Access", settings.exitNodeAllowLanAccess ? "Enabled" : "Disabled"));
  }

  return sections.filter(Boolean).join("\n");
}

export function renderServiceStatusDetail(serviceStatus?: ServiceStatus): string {
  if (!serviceStatus) {
    return "# Service\n\nStatus unavailable.";
  }

  return [
    `# ${serviceStatus.kind === "serve" ? "Serve" : "Funnel"}`,
    "",
    renderKeyValue("Status", serviceStatus.enabled ? "Configured" : "Not configured"),
    renderKeyValue("Summary", serviceStatus.summary),
    renderKeyValue("Host", serviceStatus.host),
    renderKeyValue("Path", serviceStatus.path),
    renderKeyValue("Target", serviceStatus.target),
    "",
    "```json",
    serviceStatus.rawJson,
    "```",
  ]
    .filter(Boolean)
    .join("\n");
}
