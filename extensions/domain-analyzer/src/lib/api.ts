import { exec } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import {
  DNSInfo,
  PingInfo,
  DomainStatus,
  WhoisInfo,
  IPInfo,
  TechnologyInfo,
  ExtensionPreferences,
  DNSRecord,
  ControlPanel,
  Technology,
} from "../types";

const execAsync = promisify(exec);

interface ResponseHeaders {
  get(name: string): string | null;
}

class DomainAnalyzerAPI {
  private timeout: number;
  private enableScreenshots: boolean;
  private enableControlPanels: boolean;

  constructor() {
    const preferences = getPreferenceValues<ExtensionPreferences>();
    this.timeout = parseInt(preferences.timeout) || 10;
    this.enableScreenshots = preferences.enable_screenshots || false;
    this.enableControlPanels = preferences.enable_control_panels || false;
  }

  private async showError(title: string, message: string) {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  }

  private validateDomain(domain: string): boolean {
    const domainRegex =
      /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }

  async getDNSInfo(domain: string): Promise<DNSInfo> {
    if (!this.validateDomain(domain)) {
      throw new Error("Invalid domain");
    }

    try {
      const results: DNSInfo = {
        domain,
        A: [],
        AAAA: [],
        MX: [],
        NS: [],
        TXT: [],
        SOA: [],
        CNAME: [],
      };

      // Parallel DNS queries
      const dnsQueries = [
        this.queryDNS(domain, "A"),
        this.queryDNS(domain, "AAAA"),
        this.queryDNS(domain, "MX"),
        this.queryDNS(domain, "NS"),
        this.queryDNS(domain, "TXT"),
        this.queryDNS(domain, "SOA"),
        this.queryDNS(domain, "CNAME"),
      ];

      const dnsResults = await Promise.allSettled(dnsQueries);

      // Process results
      if (dnsResults[0].status === "fulfilled") results.A = dnsResults[0].value;
      if (dnsResults[1].status === "fulfilled")
        results.AAAA = dnsResults[1].value;
      if (dnsResults[2].status === "fulfilled")
        results.MX = dnsResults[2].value;
      if (dnsResults[3].status === "fulfilled")
        results.NS = dnsResults[3].value;
      if (dnsResults[4].status === "fulfilled")
        results.TXT = dnsResults[4].value;
      if (dnsResults[5].status === "fulfilled")
        results.SOA = dnsResults[5].value;
      if (dnsResults[6].status === "fulfilled")
        results.CNAME = dnsResults[6].value;

      // Try to get parent domain
      try {
        const parentDomain = this.getParentDomain(domain);
        if (parentDomain) {
          results.parent = parentDomain;
        }
      } catch (error) {
        // Not critical if parent cannot be obtained
      }

      return results;
    } catch (error) {
      throw new Error(`Error getting DNS information: ${error.message}`);
    }
  }

  private async queryDNS(domain: string, type: string): Promise<DNSRecord[]> {
    try {
      const { stdout } = await execAsync(`dig +short ${type} ${domain}`, {
        timeout: this.timeout * 1000,
      });

      const lines = stdout
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);

      return lines.map((line) => ({
        type,
        value: line.trim(),
      }));
    } catch (error) {
      return [];
    }
  }

  private getParentDomain(domain: string): string | null {
    const parts = domain.split(".");
    if (parts.length <= 2) return null;
    return parts.slice(1).join(".");
  }

  async getPingInfo(domain: string): Promise<PingInfo> {
    if (!this.validateDomain(domain)) {
      throw new Error("Invalid domain");
    }

    try {
      // Use full path for ping on macOS
      const pingCommand = process.platform === "darwin" ? "/sbin/ping" : "ping";
      const { stdout } = await execAsync(
        `${pingCommand} -c 4 -W ${this.timeout * 1000} ${domain}`,
        {
          timeout: (this.timeout + 5) * 1000,
        },
      );

      const lines = stdout.split("\n");
      const packetLossLine = lines.find((line) => line.includes("packet loss"));
      const timingLine = lines.find((line) => line.includes("min/avg/max"));

      let loss = 0;
      if (packetLossLine) {
        const lossMatch = packetLossLine.match(/(\d+)% packet loss/);
        if (lossMatch) {
          loss = parseInt(lossMatch[1]);
        }
      }

      let min, avg, max;
      if (timingLine) {
        const timingMatch = timingLine.match(/= ([\d.]+)\/([\d.]+)\/([\d.]+)/);
        if (timingMatch) {
          min = parseFloat(timingMatch[1]);
          avg = parseFloat(timingMatch[2]);
          max = parseFloat(timingMatch[3]);
        }
      }

      return {
        host: domain,
        alive: loss < 100,
        min,
        avg,
        max,
        loss,
        time: avg,
      };
    } catch (error) {
      return {
        host: domain,
        alive: false,
        error: `Ping error: ${error.message}`,
      };
    }
  }

  async getDomainStatus(domain: string): Promise<DomainStatus> {
    if (!this.validateDomain(domain)) {
      throw new Error("Invalid domain");
    }

    try {
      const url = domain.startsWith("http") ? domain : `https://${domain}`;
      const startTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.timeout * 1000,
      );

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "Domain-Analyzer/1.0",
        },
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const status: DomainStatus = {
        domain,
        online: response.status < 400,
        status_code: response.status,
        response_time: responseTime,
      };

      // Check SSL if HTTPS
      if (url.startsWith("https")) {
        try {
          // Get basic SSL information
          const { stdout: sslInfo } = await execAsync(
            `echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -dates 2>/dev/null`,
          );

          if (sslInfo) {
            status.ssl_valid = true;
            const expiryMatch = sslInfo.match(/notAfter=(.+)/);
            if (expiryMatch) {
              status.ssl_expires = expiryMatch[1];
            }
          }
        } catch (sslError) {
          status.ssl_valid = false;
        }
      }

      // Screenshot if enabled
      if (this.enableScreenshots) {
        try {
          status.screenshot_url = await this.getScreenshot(domain);
        } catch (screenshotError) {
          // Not critical if screenshot fails
        }
      }

      return status;
    } catch (error) {
      return {
        domain,
        online: false,
        error: `Error checking status: ${error.message}`,
      };
    }
  }

  private async getScreenshot(domain: string): Promise<string> {
    // Use direct service that generates image immediately
    const url = domain.startsWith("http") ? domain : `https://${domain}`;

    // Website-shot.com - simple and direct service without API key
    // Generates image immediately at URL
    return `https://mini.s-shot.ru/1024x768/JPEG/1024/Z100/?${encodeURIComponent(url)}`;
  }

  async getWhoisInfo(domain: string): Promise<WhoisInfo> {
    if (!this.validateDomain(domain)) {
      throw new Error("Invalid domain");
    }

    try {
      const { stdout } = await execAsync(`whois ${domain}`, {
        timeout: this.timeout * 1000,
      });

      const whoisData = this.parseWhoisData(stdout);
      return {
        domain,
        ...whoisData,
      };
    } catch (error) {
      return {
        domain,
        error: `Whois query error: ${error.message}`,
      };
    }
  }

  private parseWhoisData(whoisText: string): Partial<WhoisInfo> {
    const lines = whoisText.split("\n");
    const result: Partial<WhoisInfo> = {};

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.startsWith("%") || cleanLine.startsWith("#"))
        continue;

      if (cleanLine.toLowerCase().includes("registrar:")) {
        result.registrar = cleanLine.split(":")[1]?.trim();
      } else if (
        cleanLine.toLowerCase().includes("creation date:") ||
        cleanLine.toLowerCase().includes("created:")
      ) {
        result.created_date = cleanLine.split(":")[1]?.trim();
      } else if (
        cleanLine.toLowerCase().includes("updated date:") ||
        cleanLine.toLowerCase().includes("updated:")
      ) {
        result.updated_date = cleanLine.split(":")[1]?.trim();
      } else if (
        cleanLine.toLowerCase().includes("expiry date:") ||
        cleanLine.toLowerCase().includes("expires:")
      ) {
        result.expires_date = cleanLine.split(":")[1]?.trim();
      } else if (
        cleanLine.toLowerCase().includes("name server:") ||
        cleanLine.toLowerCase().includes("nameserver:")
      ) {
        if (!result.nameservers) result.nameservers = [];
        const ns = cleanLine.split(":")[1]?.trim();
        if (ns) result.nameservers.push(ns);
      }
    }

    return result;
  }

  async getIPInfo(domain: string): Promise<IPInfo> {
    if (!this.validateDomain(domain)) {
      throw new Error("Invalid domain");
    }

    try {
      // First get domain IP
      const { stdout: ipOutput } = await execAsync(`dig +short A ${domain}`);
      const ip = ipOutput.trim().split("\n")[0];

      if (!ip || !this.isValidIP(ip)) {
        throw new Error("Could not resolve domain IP");
      }

      // Execute parallel queries
      const [geoData, reverseDns] = await Promise.allSettled([
        this.getGeoLocation(ip),
        this.getReverseDNS(ip),
      ]);

      const result: IPInfo = { ip };

      // Process geographic information
      if (geoData.status === "fulfilled") {
        Object.assign(result, geoData.value);
      }

      // Process reverse DNS
      if (reverseDns.status === "fulfilled") {
        result.reverse_dns = reverseDns.value;
      }

      // Process control panels (only if enabled)
      if (this.enableControlPanels) {
        try {
          result.control_panels = await this.detectControlPanels(ip);
        } catch (error) {
          // Control panel detection is not critical
        }
      }

      return result;
    } catch (error) {
      return {
        ip: "",
        error: `Error getting IP information: ${error.message}`,
      };
    }
  }

  private async getGeoLocation(ip: string): Promise<Partial<IPInfo>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.timeout * 1000,
      );

      const response = await fetch(`http://ip-api.com/json/${ip}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Error querying geographic information");
      }

      const data = (await response.json()) as {
        country?: string;
        countryCode?: string;
        regionName?: string;
        city?: string;
        isp?: string;
        org?: string;
        as?: string;
        timezone?: string;
      };

      return {
        country: data.country,
        country_code: data.countryCode,
        region: data.regionName,
        city: data.city,
        isp: data.isp,
        organization: data.org,
        as: data.as,
        timezone: data.timezone,
      };
    } catch (error) {
      return {};
    }
  }

  private async getReverseDNS(ip: string): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync(`dig +short -x ${ip}`, {
        timeout: this.timeout * 1000,
      });

      const result = stdout.trim();
      return result && result !== "" ? result.replace(/\.$/, "") : undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async detectControlPanels(ip: string): Promise<ControlPanel[]> {
    try {
      // Most common hosting panels
      const potentialPanels = [
        { name: "cPanel", port: 2083 },
        { name: "cPanel (HTTP)", port: 2082 },
        { name: "Plesk", port: 8443 },
        { name: "DirectAdmin", port: 2222 },
        { name: "Webmin", port: 10000 },
      ];

      const detectedPanels: ControlPanel[] = [];

      // Check each panel using native macOS netcat (nc)
      for (const panel of potentialPanels) {
        try {
          // Use netcat to check if port is open
          await execAsync(`nc -z -w3 ${ip} ${panel.port}`, {
            timeout: 4000,
          });

          // If nc doesn't fail, port is open
          const protocol =
            panel.port >= 8000 || panel.port === 443 ? "https" : "http";
          const url = `${protocol}://${ip}:${panel.port}/`;

          detectedPanels.push({
            name: panel.name,
            port: panel.port,
            accessible: true,
            url: url,
          });
        } catch (error) {
          // Port closed or not accessible, continue with next
        }
      }

      return detectedPanels;
    } catch (error) {
      console.log("Error detecting control panels:", error);
      return [];
    }
  }

  private isValidIP(ip: string): boolean {
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  async getTechnologyInfo(domain: string): Promise<TechnologyInfo> {
    if (!this.validateDomain(domain)) {
      throw new Error("Invalid domain");
    }

    try {
      const url = domain.startsWith("http") ? domain : `https://${domain}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.timeout * 1000,
      );

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const headers = response.headers;

      const technologies = this.detectTechnologies(html, headers);

      return {
        domain,
        technologies,
        server: headers.get("server") || undefined,
        cms: this.detectCMS(html),
        languages: this.detectLanguages(html, headers),
        frameworks: this.detectFrameworks(html),
      };
    } catch (error) {
      return {
        domain,
        technologies: [],
        error: `Error detecting technologies: ${error.message}`,
      };
    }
  }

  private detectTechnologies(
    html: string,
    headers: ResponseHeaders,
  ): Technology[] {
    const technologies: Technology[] = [];

    // Detect web server
    const server = headers.get("server");
    if (server) {
      technologies.push({
        name: server.split("/")[0],
        version: server.split("/")[1],
        category: "Web Server",
        confidence: 100,
      });
    }

    // Detect common frameworks and libraries
    const detectors = [
      { name: "WordPress", pattern: /wp-content|wordpress/i, category: "CMS" },
      { name: "Drupal", pattern: /drupal/i, category: "CMS" },
      { name: "Joomla", pattern: /joomla/i, category: "CMS" },
      { name: "jQuery", pattern: /jquery/i, category: "JavaScript Library" },
      {
        name: "React",
        pattern: /react[.\-_]/i,
        category: "JavaScript Framework",
      },
      {
        name: "Vue.js",
        pattern: /vue[.\-_]/i,
        category: "JavaScript Framework",
      },
      {
        name: "Angular",
        pattern: /angular/i,
        category: "JavaScript Framework",
      },
      { name: "Bootstrap", pattern: /bootstrap/i, category: "CSS Framework" },
      {
        name: "Font Awesome",
        pattern: /font-awesome|fontawesome/i,
        category: "Font Script",
      },
    ];

    for (const detector of detectors) {
      if (detector.pattern.test(html)) {
        technologies.push({
          name: detector.name,
          category: detector.category,
          confidence: 80,
        });
      }
    }

    return technologies;
  }

  private detectCMS(html: string): string | undefined {
    if (/wp-content|wordpress/i.test(html)) return "WordPress";
    if (/drupal/i.test(html)) return "Drupal";
    if (/joomla/i.test(html)) return "Joomla";
    return undefined;
  }

  private detectLanguages(html: string, headers: ResponseHeaders): string[] {
    const languages: string[] = [];

    const xPoweredBy = headers.get("x-powered-by");
    if (xPoweredBy) {
      if (/php/i.test(xPoweredBy)) languages.push("PHP");
      if (/asp\.net/i.test(xPoweredBy)) languages.push("ASP.NET");
    }

    // Detect by content
    if (/<\?php/i.test(html)) languages.push("PHP");
    if (/\.aspx|__doPostBack/i.test(html)) languages.push("ASP.NET");
    if (/\.jsp|<%|%>/i.test(html)) languages.push("JSP");

    return [...new Set(languages)]; // Remove duplicates
  }

  private detectFrameworks(html: string): string[] {
    const frameworks = [];

    if (/next\.js|_next/i.test(html)) frameworks.push("Next.js");
    if (/nuxt\.js|_nuxt/i.test(html)) frameworks.push("Nuxt.js");
    if (/gatsby/i.test(html)) frameworks.push("Gatsby");
    if (/angular/i.test(html)) frameworks.push("Angular");
    if (/react/i.test(html)) frameworks.push("React");
    if (/vue/i.test(html)) frameworks.push("Vue.js");

    return [...new Set(frameworks)];
  }
}

export const domainAnalyzerAPI = new DomainAnalyzerAPI();
