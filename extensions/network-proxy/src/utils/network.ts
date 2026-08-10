import { exec } from "child_process";
import { promisify } from "util";
import { ProxySettings } from "../types/proxy";

const execAsync = promisify(exec);

export class NetworkUtils {
  // Get available network services
  static async getAvailableNetworkServices(): Promise<string[]> {
    try {
      const { stdout } = await execAsync("/usr/sbin/networksetup -listallnetworkservices");

      const lines = stdout.split("\n");
      const services = [];

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines, header line, and disabled services (starting with *)
        if (
          !trimmed ||
          trimmed.includes("An asterisk") ||
          trimmed.includes("denotes that") ||
          trimmed.startsWith("*")
        ) {
          continue;
        }

        // Only add non-empty valid service names
        if (trimmed.length > 0) {
          services.push(trimmed);
        }
      }

      return services;
    } catch (error) {
      console.error("Error getting network services:", error);
      return ["Wi-Fi", "Ethernet"]; // Default fallback
    }
  }

  // Get the primary network service
  static async getPrimaryNetworkService(): Promise<string> {
    try {
      const activeServices = await this.getAllActiveNetworkServices();

      if (activeServices.length > 0) {
        // Prefer wired connections over wireless
        const wiredService = activeServices.find((s) => s.connectionType === "Wired");
        if (wiredService) {
          return wiredService.service;
        }

        // Then prefer wireless connections
        const wirelessService = activeServices.find((s) => s.connectionType === "Wireless");
        if (wirelessService) {
          return wirelessService.service;
        }

        // Otherwise return the first active service
        return activeServices[0].service;
      }

      // Fallback to checking common service names
      const services = await this.getAvailableNetworkServices();
      const commonServices = ["Wi-Fi", "Ethernet", "USB 10/100/1000 LAN", "USB 10/100/1G/2.5G LAN"];

      for (const commonService of commonServices) {
        if (services.includes(commonService)) {
          return commonService;
        }
      }

      // Return first available service
      return services[0] || "Wi-Fi";
    } catch (error) {
      console.error("Error getting primary network service:", error);
      return "Wi-Fi"; // Default fallback
    }
  }

  // Get all active network services with IP addresses
  static async getAllActiveNetworkServices(): Promise<{ service: string; connectionType: string }[]> {
    try {
      const services = await this.getAvailableNetworkServices();
      const activeServices = [];

      for (const service of services) {
        try {
          const { stdout } = await execAsync(`/usr/sbin/networksetup -getinfo "${service}"`);

          // Check if service has an IP address (is active)
          // Look for "IP address: x.x.x.x" pattern, not "IP address: none" or empty
          const ipAddressMatch = stdout.match(/IP address: (.+)/);
          const hasIPAddress =
            ipAddressMatch &&
            ipAddressMatch[1].trim() !== "none" &&
            ipAddressMatch[1].trim() !== "" &&
            ipAddressMatch[1].trim().match(/^\d+\.\d+\.\d+\.\d+$/);

          if (hasIPAddress) {
            // Determine connection type based on service name
            let connectionType = "Unknown";
            const serviceLower = service.toLowerCase();

            if (serviceLower.includes("wi-fi") || serviceLower.includes("wifi") || serviceLower.includes("airport")) {
              connectionType = "Wireless";
            } else if (
              serviceLower.includes("ethernet") ||
              serviceLower.includes("lan") ||
              serviceLower.includes("usb") ||
              serviceLower.includes("thunderbolt")
            ) {
              connectionType = "Wired";
            } else if (serviceLower.includes("bluetooth")) {
              connectionType = "Bluetooth";
            } else if (serviceLower.includes("vpn") || serviceLower.includes("ppp")) {
              connectionType = "VPN";
            } else if (serviceLower.includes("iphone") || serviceLower.includes("ipad")) {
              connectionType = "Mobile Hotspot";
            } else if (serviceLower.includes("bridge")) {
              connectionType = "Bridge";
            }

            activeServices.push({ service, connectionType });
          }
        } catch (error) {
          console.error(`Error checking service "${service}":`, error);
          // Skip services that cause errors
          continue;
        }
      }

      return activeServices;
    } catch (error) {
      console.error("Error getting active network services:", error);
      return []; // Empty list as fallback
    }
  }

  // Use scutil to get proxy settings as a more reliable method
  static async getProxySettingsViaScutil(): Promise<ProxySettings> {
    try {
      const { stdout } = await execAsync("/usr/sbin/scutil --proxy");
      const settings: ProxySettings = {};

      // Parse HTTP proxy
      const httpEnabled = stdout.match(/HTTPEnable\s*:\s*(\d+)/)?.[1] === "1";
      const httpProxy = stdout.match(/HTTPProxy\s*:\s*(.+)/)?.[1]?.trim();
      const httpPort = stdout.match(/HTTPPort\s*:\s*(\d+)/)?.[1];
      if (httpEnabled && httpProxy && httpPort) {
        settings.httpProxy = `${httpProxy}:${httpPort}`;
      }

      // Parse HTTPS proxy
      const httpsEnabled = stdout.match(/HTTPSEnable\s*:\s*(\d+)/)?.[1] === "1";
      const httpsProxy = stdout.match(/HTTPSProxy\s*:\s*(.+)/)?.[1]?.trim();
      const httpsPort = stdout.match(/HTTPSPort\s*:\s*(\d+)/)?.[1];
      if (httpsEnabled && httpsProxy && httpsPort) {
        settings.httpsProxy = `${httpsProxy}:${httpsPort}`;
      }

      // Parse SOCKS proxy
      const socksEnabled = stdout.match(/SOCKSEnable\s*:\s*(\d+)/)?.[1] === "1";
      const socksProxy = stdout.match(/SOCKSProxy\s*:\s*(.+)/)?.[1]?.trim();
      const socksPort = stdout.match(/SOCKSPort\s*:\s*(\d+)/)?.[1];
      if (socksEnabled && socksProxy && socksPort) {
        settings.socksProxy = `${socksProxy}:${socksPort}`;
      }

      // Parse auto proxy URL
      const autoProxyUrl = stdout.match(/ProxyAutoConfigURLString\s*:\s*(.+)/)?.[1]?.trim();
      if (autoProxyUrl) {
        settings.autoProxyUrl = autoProxyUrl;
      }

      // Parse exceptions list
      const exceptionsMatch = stdout.match(/ExceptionsList\s*:\s*<array>\s*{([^}]+)}/);
      if (exceptionsMatch) {
        const exceptions = exceptionsMatch[1]
          .split("\n")
          .map((line) => line.match(/\d+\s*:\s*(.+)/)?.[1]?.trim())
          .filter(Boolean);
        if (exceptions.length > 0) {
          settings.noProxy = exceptions.join(", ");
        }
      }

      settings.proxyEnabled = !!(
        settings.httpProxy ||
        settings.httpsProxy ||
        settings.socksProxy ||
        settings.autoProxyUrl
      );

      return settings;
    } catch (error) {
      console.error("Error getting proxy settings via scutil:", error);
      return {};
    }
  }

  // Get proxy settings for a specific service using networksetup
  static async getProxySettingsViaNetworksetup(service: string): Promise<ProxySettings> {
    const settings: ProxySettings = {};

    // First, validate that the service exists
    try {
      const availableServices = await this.getAvailableNetworkServices();
      if (!availableServices.includes(service)) {
        console.error(`Service "${service}" not found in available services`);
        return settings;
      }
    } catch (error) {
      console.error("Error validating service:", error);
      return settings;
    }

    // Helper function to safely get proxy info
    async function getProxyInfo(
      command: string,
      proxyType: string,
    ): Promise<{ server?: string; port?: string; enabled?: boolean }> {
      try {
        const { stdout } = await execAsync(`/usr/sbin/networksetup -get${command} "${service}"`);
        const serverMatch = stdout.match(/Server: (.+)/);
        const portMatch = stdout.match(/Port: (.+)/);
        const enabledMatch = stdout.match(/Enabled: (.+)/);

        return {
          server: serverMatch ? serverMatch[1].trim() : undefined,
          port: portMatch ? portMatch[1].trim() : undefined,
          enabled: enabledMatch ? enabledMatch[1].trim() === "Yes" : false,
        };
      } catch (error) {
        console.error(`Error getting ${proxyType} proxy settings:`, error);
        return { enabled: false };
      }
    }

    try {
      // Get HTTP proxy
      const httpInfo = await getProxyInfo("webproxy", "HTTP");
      if (httpInfo.enabled && httpInfo.server && httpInfo.port) {
        settings.httpProxy = `${httpInfo.server}:${httpInfo.port}`;
      }

      // Get HTTPS proxy
      const httpsInfo = await getProxyInfo("securewebproxy", "HTTPS");
      if (httpsInfo.enabled && httpsInfo.server && httpsInfo.port) {
        settings.httpsProxy = `${httpsInfo.server}:${httpsInfo.port}`;
      }

      // Get SOCKS proxy
      const socksInfo = await getProxyInfo("socksfirewallproxy", "SOCKS");
      if (socksInfo.enabled && socksInfo.server && socksInfo.port) {
        settings.socksProxy = `${socksInfo.server}:${socksInfo.port}`;
      }

      // Get auto proxy URL
      try {
        const { stdout: autoProxyOutput } = await execAsync(`/usr/sbin/networksetup -getautoproxyurl "${service}"`);
        const urlMatch = autoProxyOutput.match(/URL: (.+)/);
        const autoProxyEnabled = autoProxyOutput.match(/Enabled: (.+)/)?.[1]?.trim() === "Yes";
        if (autoProxyEnabled && urlMatch) {
          settings.autoProxyUrl = urlMatch[1].trim();
        }
      } catch (error) {
        console.error("Error getting auto proxy URL:", error);
      }

      // Get proxy bypass list
      try {
        const { stdout: proxyBypass } = await execAsync(`/usr/sbin/networksetup -getproxybypassdomains "${service}"`);
        if (proxyBypass.trim() && !proxyBypass.includes("There aren't any bypass domains")) {
          settings.noProxy = proxyBypass
            .split("\n")
            .filter((line) => line.trim())
            .join(", ");
        }
      } catch (error) {
        console.error("Error getting proxy bypass domains:", error);
      }

      settings.proxyEnabled = !!(
        settings.httpProxy ||
        settings.httpsProxy ||
        settings.socksProxy ||
        settings.autoProxyUrl
      );
    } catch (error) {
      console.error(`Error getting proxy settings for "${service}":`, error);
    }

    return settings;
  }

  // Set HTTP proxy
  static async setHttpProxy(service: string, server: string, port: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setwebproxy "${service}" "${server}" "${port}"`);
    } catch (error) {
      throw new Error(`Failed to set HTTP proxy: ${error}`);
    }
  }

  // Set HTTPS proxy
  static async setHttpsProxy(service: string, server: string, port: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setsecurewebproxy "${service}" "${server}" "${port}"`);
    } catch (error) {
      throw new Error(`Failed to set HTTPS proxy: ${error}`);
    }
  }

  // Set SOCKS proxy
  static async setSocksProxy(service: string, server: string, port: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setsocksfirewallproxy "${service}" "${server}" "${port}"`);
    } catch (error) {
      throw new Error(`Failed to set SOCKS proxy: ${error}`);
    }
  }

  // Set auto proxy URL
  static async setAutoProxyUrl(service: string, url: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setautoproxyurl "${service}" "${url}"`);
    } catch (error) {
      throw new Error(`Failed to set auto proxy URL: ${error}`);
    }
  }

  // Disable HTTP proxy
  static async disableHttpProxy(service: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setwebproxystate "${service}" off`);
    } catch (error) {
      throw new Error(`Failed to disable HTTP proxy: ${error}`);
    }
  }

  // Disable HTTPS proxy
  static async disableHttpsProxy(service: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setsecurewebproxystate "${service}" off`);
    } catch (error) {
      throw new Error(`Failed to disable HTTPS proxy: ${error}`);
    }
  }

  // Disable SOCKS proxy
  static async disableSocksProxy(service: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setsocksfirewallproxystate "${service}" off`);
    } catch (error) {
      throw new Error(`Failed to disable SOCKS proxy: ${error}`);
    }
  }

  // Disable auto proxy URL
  static async disableAutoProxyUrl(service: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setautoproxystate "${service}" off`);
    } catch (error) {
      throw new Error(`Failed to disable auto proxy URL: ${error}`);
    }
  }

  // Enable HTTP proxy
  static async enableHttpProxy(service: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setwebproxystate "${service}" on`);
    } catch (error) {
      throw new Error(`Failed to enable HTTP proxy: ${error}`);
    }
  }

  // Enable HTTPS proxy
  static async enableHttpsProxy(service: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setsecurewebproxystate "${service}" on`);
    } catch (error) {
      throw new Error(`Failed to enable HTTPS proxy: ${error}`);
    }
  }

  // Enable SOCKS proxy
  static async enableSocksProxy(service: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setsocksfirewallproxystate "${service}" on`);
    } catch (error) {
      throw new Error(`Failed to enable SOCKS proxy: ${error}`);
    }
  }

  // Enable auto proxy URL
  static async enableAutoProxyUrl(service: string): Promise<void> {
    try {
      await execAsync(`/usr/sbin/networksetup -setautoproxystate "${service}" on`);
    } catch (error) {
      throw new Error(`Failed to enable auto proxy URL: ${error}`);
    }
  }

  // Set proxy bypass domains
  static async setProxyBypassDomains(service: string, domains: string): Promise<void> {
    try {
      if (domains.trim()) {
        // Split by comma and clean up each domain
        const domainList = domains
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
        // Use networksetup to set bypass domains
        await execAsync(
          `/usr/sbin/networksetup -setproxybypassdomains "${service}" ${domainList.map((d) => `"${d}"`).join(" ")}`,
        );
      } else {
        // Clear bypass domains
        await execAsync(`/usr/sbin/networksetup -setproxybypassdomains "${service}" "Empty"`);
      }
    } catch (error) {
      throw new Error(`Failed to set proxy bypass domains: ${error}`);
    }
  }
}
