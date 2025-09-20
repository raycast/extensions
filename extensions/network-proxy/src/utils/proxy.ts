import { ProxySettings, ProxyInfoItem } from "../types/proxy";
import { Icon } from "@raycast/api";

export class ProxyUtils {
  // Create proxy info items for List display
  static createProxyInfoItems(settings: ProxySettings, service: string): ProxyInfoItem[] {
    const items: ProxyInfoItem[] = [];

    // Add network service info
    items.push({
      id: "service",
      title: "Network Service",
      subtitle: service,
      icon: Icon.Network,
      accessories: [{ text: "Active" }],
      type: "service",
      editable: false,
    });

    // Add proxy status
    const proxyEnabled = settings.proxyEnabled;
    items.push({
      id: "status",
      title: "Proxy Status",
      subtitle: proxyEnabled ? "Enabled" : "Disabled",
      icon: proxyEnabled ? Icon.CheckCircle : Icon.XMarkCircle,
      accessories: [
        {
          text: proxyEnabled ? "ON" : "OFF",
          tooltip: proxyEnabled ? "Proxy is enabled" : "No proxy configured",
        },
      ],
      type: "status",
      editable: false,
    });

    // Add HTTP proxy if available
    if (settings.httpProxy) {
      items.push({
        id: "http",
        title: "HTTP Proxy",
        subtitle: settings.httpProxy,
        icon: Icon.Globe,
        accessories: [{ text: "HTTP" }],
        type: "http",
        value: settings.httpProxy,
        editable: true,
      });
    }

    // Add HTTPS proxy if available
    if (settings.httpsProxy) {
      items.push({
        id: "https",
        title: "HTTPS Proxy",
        subtitle: settings.httpsProxy,
        icon: Icon.Lock,
        accessories: [{ text: "HTTPS" }],
        type: "https",
        value: settings.httpsProxy,
        editable: true,
      });
    }

    // Add SOCKS proxy if available
    if (settings.socksProxy) {
      items.push({
        id: "socks",
        title: "SOCKS Proxy",
        subtitle: settings.socksProxy,
        icon: Icon.Plug,
        accessories: [{ text: "SOCKS" }],
        type: "socks",
        value: settings.socksProxy,
        editable: true,
      });
    }

    // Add auto proxy URL if available
    if (settings.autoProxyUrl) {
      items.push({
        id: "auto",
        title: "Auto Proxy URL",
        subtitle: settings.autoProxyUrl,
        icon: Icon.Repeat,
        accessories: [{ text: "PAC" }],
        type: "auto",
        value: settings.autoProxyUrl,
        editable: true,
      });
    }

    // Add bypass domains if available
    if (settings.noProxy) {
      items.push({
        id: "bypass",
        title: "Bypass Domains",
        subtitle: settings.noProxy,
        icon: Icon.ArrowRight,
        accessories: [{ text: "Exceptions" }],
        type: "bypass",
        value: settings.noProxy,
        editable: true,
      });
    }

    return items;
  }

  // Format proxy information for copying
  static formatProxyInfoForCopy(settings: ProxySettings, service: string): string {
    let info = `🌐 Network Service: ${service}\n\n`;

    if (!settings.proxyEnabled) {
      info += "❌ No proxy configured\n";
      return info;
    }

    info += "✅ Proxy Status: Enabled\n\n";

    if (settings.httpProxy) {
      info += `🔗 HTTP Proxy: ${settings.httpProxy}\n`;
    }

    if (settings.httpsProxy) {
      info += `🔒 HTTPS Proxy: ${settings.httpsProxy}\n`;
    }

    if (settings.socksProxy) {
      info += `🧦 SOCKS Proxy: ${settings.socksProxy}\n`;
    }

    if (settings.autoProxyUrl) {
      info += `🔄 Auto Proxy URL: ${settings.autoProxyUrl}\n`;
    }

    if (settings.noProxy) {
      info += `\n🚫 Bypass domains: ${settings.noProxy}\n`;
    }

    return info;
  }

  // Parse proxy address (server:port)
  static parseProxyAddress(address: string): { server: string; port: string } {
    const parts = address.split(":");
    if (parts.length < 2) {
      throw new Error("Invalid proxy address format. Expected format: server:port");
    }

    const server = parts.slice(0, -1).join(":"); // Handle IPv6 addresses
    const port = parts[parts.length - 1];

    if (!server || !port) {
      throw new Error("Invalid proxy address format. Expected format: server:port");
    }

    return { server, port };
  }

  // Validate proxy port
  static validatePort(port: string): boolean {
    const portNumber = parseInt(port, 10);
    return !isNaN(portNumber) && portNumber > 0 && portNumber <= 65535;
  }

  // Validate proxy server
  static validateServer(server: string): boolean {
    // Basic validation for server address (can be IP or hostname)
    if (!server || server.trim().length === 0) {
      return false;
    }

    // Check for valid characters (basic check)
    const validChars = /^[a-zA-Z0-9.-]+$/;
    return validChars.test(server.trim());
  }

  // Validate proxy URL
  static validateProxyUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
