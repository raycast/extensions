import { exec } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  DNSInfo,
  PingInfo,
  DomainStatus,
  WhoisInfo,
  IPInfo,
  TechnologyInfo,
  ExtensionPreferences,
  DNSRecord,
  Technology,
} from "../types";

const execAsync = promisify(exec);

interface ResponseHeaders {
  get(name: string): string | null;
}

// Rate limiting state
interface ApiCall {
  lastCall: number;
  callCount: number;
  backoffUntil?: number;
}

const API_RATE_LIMITS: Record<string, ApiCall> = {};
const MIN_DELAY_MS = 100; // Minimum delay between calls
const MAX_DELAY_MS = 5000; // Maximum backoff delay
const MAX_CALLS_PER_MINUTE = 30; // Rate limit

class DomainAnalyzerAPI {
  private timeout: number;

  constructor() {
    const preferences = getPreferenceValues<ExtensionPreferences>();
    this.timeout = this.sanitizeTimeout(preferences.timeout || 10);
  }

  private async showError(title: string, message: string) {
    await showFailureToast(title, { message });
  }

  private async rateLimit(apiName: string): Promise<void> {
    const now = Date.now();
    const apiCall = API_RATE_LIMITS[apiName] || { lastCall: 0, callCount: 0 };

    // Check if we're in backoff period
    if (apiCall.backoffUntil && now < apiCall.backoffUntil) {
      const waitTime = apiCall.backoffUntil - now;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.rateLimit(apiName); // Recursive call after waiting
    }

    // Reset call count if more than a minute has passed
    if (now - apiCall.lastCall > 60000) {
      apiCall.callCount = 0;
    }

    // Check rate limit
    if (apiCall.callCount >= MAX_CALLS_PER_MINUTE) {
      const backoffTime = Math.min(MIN_DELAY_MS * Math.pow(2, apiCall.callCount - MAX_CALLS_PER_MINUTE), MAX_DELAY_MS);
      apiCall.backoffUntil = now + backoffTime;
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
      return this.rateLimit(apiName); // Recursive call after backoff
    }

    // Ensure minimum delay between calls
    const timeSinceLastCall = now - apiCall.lastCall;
    if (timeSinceLastCall < MIN_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS - timeSinceLastCall));
    }

    // Update API call tracking
    apiCall.lastCall = Date.now();
    apiCall.callCount++;
    API_RATE_LIMITS[apiName] = apiCall;
  }

  private async retryWithBackoff<T>(operation: () => Promise<T>, apiName: string, maxRetries: number = 3): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.rateLimit(apiName);
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on validation errors
        if (lastError.message.includes("Invalid domain") || lastError.message.includes("Invalid format")) {
          throw lastError;
        }

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff for retries
        const backoffTime = Math.min(MIN_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }
    }

    throw lastError!;
  }

  private validateDomain(domain: string): boolean {
    // More strict domain validation with length and character checks
    if (!domain || typeof domain !== "string") return false;
    if (domain.length < 1 || domain.length > 253) return false;
    if (domain.startsWith(".") || domain.endsWith(".")) return false;
    if (domain.includes("..")) return false;

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/;
    return domainRegex.test(domain);
  }

  private escapeDomain(domain: string): string {
    // More secure domain escaping - only allow valid domain characters
    if (!domain || typeof domain !== "string") return "";
    return domain.replace(/[^a-zA-Z0-9.-]/g, "").substring(0, 253);
  }

  private escapeShellArg(arg: string): string {
    // Ultra-strict shell argument escaping - only alphanumeric, dots, and hyphens
    if (!arg || typeof arg !== "string") return "";
    const escaped = arg.replace(/[^a-zA-Z0-9.-]/g, "");
    // Additional validation: no consecutive dots, no leading/trailing dots or hyphens
    if (
      escaped.includes("..") ||
      escaped.startsWith(".") ||
      escaped.startsWith("-") ||
      escaped.endsWith(".") ||
      escaped.endsWith("-")
    ) {
      return "";
    }
    return escaped.substring(0, 253);
  }

  private sanitizeTimeout(timeout: number): number {
    // Ensure timeout is a safe positive integer within reasonable bounds
    const num = Math.floor(Math.abs(timeout));
    return Math.min(Math.max(num, 1), 30); // Between 1 and 30 seconds
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

      // Process results with strict type checking
      if (dnsResults[0]?.status === "fulfilled") results.A = dnsResults[0].value;
      if (dnsResults[1]?.status === "fulfilled") results.AAAA = dnsResults[1].value;
      if (dnsResults[2]?.status === "fulfilled") results.MX = dnsResults[2].value;
      if (dnsResults[3]?.status === "fulfilled") results.NS = dnsResults[3].value;
      if (dnsResults[4]?.status === "fulfilled") results.TXT = dnsResults[4].value;
      if (dnsResults[5]?.status === "fulfilled") results.SOA = dnsResults[5].value;
      if (dnsResults[6]?.status === "fulfilled") results.CNAME = dnsResults[6].value;

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
      throw new Error(`Error getting DNS information: ${(error as Error).message}`);
    }
  }

  private async queryDNS(domain: string, type: string): Promise<DNSRecord[]> {
    try {
      const safeDomain = this.escapeShellArg(this.escapeDomain(domain));
      const safeType = type.replace(/[^A-Z]/g, ""); // Only allow uppercase letters for DNS types

      // Validate inputs
      if (!safeDomain || !safeType) {
        return [];
      }

      // Use array-based command execution to prevent injection
      const sanitizedTimeout = this.sanitizeTimeout(this.timeout);
      const { stdout } = await execAsync(`dig +short ${safeType} ${safeDomain}`, {
        timeout: sanitizedTimeout * 1000,
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
      const safeDomain = this.escapeShellArg(this.escapeDomain(domain));

      // Validate escaped domain
      if (!safeDomain) {
        throw new Error("Invalid domain after sanitization");
      }

      // Use full path for ping on macOS with strict validation
      const pingCommand = process.platform === "darwin" ? "/sbin/ping" : "ping";
      const sanitizedTimeout = this.sanitizeTimeout(this.timeout);
      const timeoutMs = sanitizedTimeout * 1000;

      // Additional validation before command execution
      if (!safeDomain.match(/^[a-zA-Z0-9.-]+$/)) {
        throw new Error("Invalid domain format after sanitization");
      }

      const { stdout } = await execAsync(`${pingCommand} -c 4 -W ${timeoutMs} ${safeDomain}`, {
        timeout: (sanitizedTimeout + 5) * 1000,
      });

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
        error: `Ping error: ${(error as Error).message}`,
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
      const timeoutId = setTimeout(() => controller.abort(), this.timeout * 1000);

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Domain Analyzer/1.0",
        },
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      let sslValid = false;
      let sslExpires;

      // Check SSL certificate if it's HTTPS
      if (url.startsWith("https://")) {
        try {
          const urlObj = new URL(url);
          const safeHostname = this.escapeShellArg(urlObj.hostname);

          // Validate hostname after sanitization
          if (!safeHostname || !this.validateDomain(safeHostname)) {
            throw new Error("Invalid hostname for SSL check");
          }

          const sanitizedTimeout = this.sanitizeTimeout(this.timeout);
          const { stdout } = await execAsync(
            `echo | openssl s_client -connect ${safeHostname}:443 -servername ${safeHostname} 2>/dev/null | openssl x509 -noout -dates`,
            { timeout: sanitizedTimeout * 1000 },
          );

          if (stdout.includes("notAfter")) {
            sslValid = true;
            const notAfterMatch = stdout.match(/notAfter=(.+)/);
            if (notAfterMatch) {
              sslExpires = notAfterMatch[1].trim();
            }
          }
        } catch (sslError) {
          // SSL check failed, but domain might still be accessible
        }
      }

      const result: DomainStatus = {
        domain,
        online: response.ok,
        status_code: response.status,
        response_time: responseTime,
        ssl_valid: sslValid,
        ssl_expires: sslExpires,
      };

      return result;
    } catch (error) {
      return {
        domain,
        online: false,
        error: `Status check error: ${(error as Error).message}`,
      };
    }
  }

  async getWhoisInfo(domain: string): Promise<WhoisInfo> {
    if (!this.validateDomain(domain)) {
      throw new Error("Invalid domain");
    }

    try {
      const safeDomain = this.escapeShellArg(this.escapeDomain(domain));

      // Validate escaped domain
      if (!safeDomain) {
        throw new Error("Invalid domain after sanitization");
      }

      const sanitizedTimeout = this.sanitizeTimeout(this.timeout);
      const { stdout } = await execAsync(`whois ${safeDomain}`, {
        timeout: sanitizedTimeout * 1000,
      });

      const result: WhoisInfo = {
        domain,
        ...this.parseWhoisData(stdout),
      };

      return result;
    } catch (error) {
      return {
        domain,
        error: `Whois query error: ${(error as Error).message}`,
      };
    }
  }

  private parseWhoisData(whoisText: string): Partial<WhoisInfo> {
    const lines = whoisText.toLowerCase().split("\n");
    const result: Partial<WhoisInfo> = {};

    for (const line of lines) {
      if (line.includes("registrar:")) {
        result.registrar = line.split(":")[1]?.trim();
      } else if (line.includes("creation date:") || line.includes("created:")) {
        result.created_date = line.split(":")[1]?.trim();
      } else if (line.includes("updated date:") || line.includes("updated:")) {
        result.updated_date = line.split(":")[1]?.trim();
      } else if (line.includes("expiry date:") || line.includes("expires:") || line.includes("expiration date:")) {
        result.expires_date = line.split(":")[1]?.trim();
      }
    }

    return result;
  }

  async getIPInfo(domain: string): Promise<IPInfo> {
    if (!this.validateDomain(domain)) {
      throw new Error("Invalid domain");
    }

    try {
      // Get IP address first
      const ipRecords = await this.queryDNS(domain, "A");
      if (ipRecords.length === 0) {
        throw new Error("No IP address found for domain");
      }

      const ip = ipRecords[0].value;
      const result: IPInfo = { ip };

      // Get geolocation information
      try {
        const geoInfo = await this.getGeoLocation(ip);
        Object.assign(result, geoInfo);
      } catch (error) {
        await this.showError("Geolocation failed", `Could not get location info: ${(error as Error).message}`);
      }

      // Get reverse DNS
      try {
        result.reverse_dns = await this.getReverseDNS(ip);
      } catch (error) {
        // Reverse DNS is optional
      }

      return result;
    } catch (error) {
      return {
        ip: "",
        error: `IP info error: ${(error as Error).message}`,
      };
    }
  }

  private async getGeoLocation(ip: string): Promise<Partial<IPInfo>> {
    if (!this.isValidIP(ip)) {
      throw new Error("Invalid IP address");
    }

    return this.retryWithBackoff(async () => {
      // Using ip-api.com which is more reliable and has higher limits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout * 1000);

      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,timezone,isp,org,as`,
        {
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        status: string;
        message?: string;
        country?: string;
        countryCode?: string;
        regionName?: string;
        city?: string;
        isp?: string;
        org?: string;
        as?: string;
        timezone?: string;
      };

      if (data.status === "fail") {
        throw new Error(data.message || "Geolocation lookup failed");
      }

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
    }, "geolocation");
  }

  private async getReverseDNS(ip: string): Promise<string | undefined> {
    try {
      const safeIP = this.isValidIP(ip) ? this.escapeShellArg(ip) : "";
      if (!safeIP) return undefined;

      const sanitizedTimeout = this.sanitizeTimeout(this.timeout);
      const { stdout } = await execAsync(`dig +short -x ${safeIP}`, {
        timeout: sanitizedTimeout * 1000,
      });
      return stdout.trim() || undefined;
    } catch (error) {
      return undefined;
    }
  }

  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  async getTechnologyInfo(domain: string): Promise<TechnologyInfo> {
    if (!this.validateDomain(domain)) {
      throw new Error("Invalid domain");
    }

    return this.retryWithBackoff(async () => {
      const url = domain.startsWith("http") ? domain : `https://${domain}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout * 1000);

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "Domain Analyzer/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const headers = response.headers as ResponseHeaders;

      const technologies = this.detectTechnologies(html, headers);
      const cms = this.detectCMS(html);
      const server = headers.get("server") || undefined;
      const languages = this.detectLanguages(html, headers);
      const frameworks = this.detectFrameworks(html);

      return {
        domain,
        technologies,
        cms,
        server,
        languages,
        frameworks,
      };
    }, "technology").catch((error) => ({
      domain,
      technologies: [],
      error: `Technology detection error: ${(error as Error).message}`,
    }));
  }

  private detectTechnologies(html: string, _headers: ResponseHeaders): Technology[] {
    const technologies: Technology[] = [];

    // Detect based on meta tags
    const metaGenerator = html.match(/<meta\s+name=["']generator["']\s+content=["']([^"']+)["']/i);
    if (metaGenerator) {
      technologies.push({
        name: metaGenerator[1],
        category: "CMS",
        confidence: 90,
      });
    }

    // Detect WordPress
    if (html.includes("wp-content") || html.includes("wp-includes") || html.includes("wordpress")) {
      technologies.push({
        name: "WordPress",
        category: "CMS",
        confidence: 95,
      });
    }

    // Detect React
    if (html.includes("react") || html.includes("_reactListening")) {
      technologies.push({
        name: "React",
        category: "JavaScript Framework",
        confidence: 85,
      });
    }

    // Detect Vue.js
    if (html.includes("vue.js") || html.includes("__vue__")) {
      technologies.push({
        name: "Vue.js",
        category: "JavaScript Framework",
        confidence: 85,
      });
    }

    // Detect Angular
    if (html.includes("ng-") || html.includes("angular")) {
      technologies.push({
        name: "Angular",
        category: "JavaScript Framework",
        confidence: 85,
      });
    }

    // Detect jQuery
    if (html.includes("jquery") || html.includes("jQuery")) {
      technologies.push({
        name: "jQuery",
        category: "JavaScript Library",
        confidence: 90,
      });
    }

    // Detect Bootstrap
    if (html.includes("bootstrap") || html.includes("cdn.jsdelivr.net/npm/bootstrap")) {
      technologies.push({
        name: "Bootstrap",
        category: "CSS Framework",
        confidence: 85,
      });
    }

    return technologies;
  }

  private detectCMS(html: string): string | undefined {
    if (html.includes("wp-content") || html.includes("wp-includes")) {
      return "WordPress";
    }
    if (html.includes("drupal") || html.includes("sites/default")) {
      return "Drupal";
    }
    if (html.includes("joomla") || html.includes("option=com_")) {
      return "Joomla";
    }
    return undefined;
  }

  private detectLanguages(html: string, headers: ResponseHeaders): string[] {
    const languages: string[] = [];

    // Check server headers for language hints
    const serverHeader = headers.get("server")?.toLowerCase();
    if (serverHeader) {
      if (serverHeader.includes("php")) languages.push("PHP");
      if (serverHeader.includes("nginx")) languages.push("Nginx");
      if (serverHeader.includes("apache")) languages.push("Apache");
    }

    // Check for ASP.NET
    if (html.includes("__VIEWSTATE") || html.includes("aspnetcdn")) {
      languages.push("ASP.NET");
    }

    // Check for PHP
    if (html.includes("<?php") || headers.get("x-powered-by")?.includes("PHP")) {
      languages.push("PHP");
    }

    return languages;
  }

  private detectFrameworks(html: string): string[] {
    const frameworks: string[] = [];

    if (html.includes("next.js") || html.includes("_next/")) {
      frameworks.push("Next.js");
    }
    if (html.includes("nuxt") || html.includes("__nuxt")) {
      frameworks.push("Nuxt.js");
    }
    if (html.includes("gatsby") || html.includes("___gatsby")) {
      frameworks.push("Gatsby");
    }

    return frameworks;
  }
}

export const domainAnalyzerAPI = new DomainAnalyzerAPI();
