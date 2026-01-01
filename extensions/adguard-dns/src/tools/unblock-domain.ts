import { Action, Tool } from "@raycast/api";
import { buildApiUrl, callAdGuardAPI, getDnsServerId, DNSServerSettings } from "../utils/adguard-api";
import { getRootDomain } from "../utils/domain-helpers";

type Input = {
  /**
   * Array of domains to unblock (e.g., ["netflix.com", "nflxvideo.net"]).
   * Multiple domains can be unblocked at once. Do not include AdGuard DNS syntax
   * like @@|| or ^ - just provide the plain domain names.
   */
  domains: string[];
};

/**
 * Adds whitelist rules to unblock one or more domains in AdGuard DNS.
 *
 * This tool creates whitelist rules using AdGuard DNS syntax (@@||domain.com^)
 * and updates the DNS server settings. It checks for existing whitelist rules
 * to avoid duplicates and reports which domains were successfully unblocked.
 *
 * IMPORTANT: A native confirmation dialog will be shown to the user before
 * unblocking any domains. The tool will only execute if the user confirms.
 */
export default async function tool(input: Input): Promise<string> {
  try {
    if (!input.domains || input.domains.length === 0) {
      return "Error: No domains specified to unblock";
    }

    const dnsServerId = getDnsServerId();

    // First, get current DNS server settings
    const getUrl = buildApiUrl(`/oapi/v1/dns_servers/${dnsServerId}`);
    const getResponse = await callAdGuardAPI(getUrl);

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`Failed to get DNS server: ${getResponse.status} ${errorText}`);
    }

    const dnsServer = (await getResponse.json()) as { settings: DNSServerSettings };
    const currentSettings = dnsServer.settings;

    // Create whitelist rules using AdGuard DNS syntax
    // Default to root domains for broader coverage
    const newRules: string[] = [];
    const alreadyWhitelisted: string[] = [];
    const processedDomains = new Set<string>(); // Avoid duplicates

    for (const domain of input.domains) {
      // Sanitize domain: remove any AdGuard syntax characters
      const cleanDomain = domain
        .replace(/^@@\|\|/, "")
        .replace(/\^+$/, "")
        .trim();

      // Extract root domain (e.g., www.peacocktv.com → peacocktv.com)
      const rootDomain = getRootDomain(cleanDomain);

      // Skip if we've already processed this root domain
      if (processedDomains.has(rootDomain)) {
        continue;
      }
      processedDomains.add(rootDomain);

      const whitelistRule = `@@||${rootDomain}^`;

      if (currentSettings.user_rules_settings.rules.includes(whitelistRule)) {
        alreadyWhitelisted.push(rootDomain);
      } else {
        newRules.push(whitelistRule);
      }
    }

    // If all domains are already whitelisted, return early
    if (newRules.length === 0) {
      const count = alreadyWhitelisted.length;
      return `All ${count} root domain${count !== 1 ? "s are" : " is"} already whitelisted:\n${alreadyWhitelisted.map((d) => `• ${d}`).join("\n")}\n\nNo changes needed.`;
    }

    // Add new rules to existing rules
    const updatedRules = [...currentSettings.user_rules_settings.rules, ...newRules];

    // Update settings with new rules
    const putUrl = buildApiUrl(`/oapi/v1/dns_servers/${dnsServerId}/settings`);
    const putResponse = await callAdGuardAPI(putUrl, {
      method: "PUT",
      body: JSON.stringify({
        user_rules_settings: {
          enabled: currentSettings.user_rules_settings.enabled,
          rules: updatedRules,
        },
      }),
    });

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      throw new Error(`Failed to update settings: ${putResponse.status} ${errorText}`);
    }

    // Build success message
    const unblockedRootDomains = Array.from(processedDomains).filter((d) => !alreadyWhitelisted.includes(d));

    let result = `✅ Unblocked ${unblockedRootDomains.length} root domain${unblockedRootDomains.length !== 1 ? "s" : ""}`;

    if (unblockedRootDomains.length > 0) {
      result += `:\n${unblockedRootDomains.map((d) => `• ${d}`).join("\n")}`;
    }

    if (alreadyWhitelisted.length > 0) {
      result += `\n\n⚠️ ${alreadyWhitelisted.length} already whitelisted:\n`;
      result += alreadyWhitelisted.map((d) => `• ${d}`).join("\n");
    }

    result += `\n\nTest your service to confirm it's working.`;

    return result;
  } catch (error) {
    if (error instanceof Error) {
      return `❌ Error unblocking domains: ${error.message}`;
    }
    return `❌ Error unblocking domains: ${String(error)}`;
  }
}

/**
 * Native confirmation dialog shown before unblocking domains.
 * This keeps the user in control of DNS whitelist modifications.
 * Shows root domains that will be unblocked (which may differ from subdomains provided).
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.domains || input.domains.length === 0) {
    return undefined; // Skip confirmation for invalid input
  }

  // Extract unique root domains
  const rootDomains = new Set<string>();
  const domainMap = new Map<string, string[]>(); // root -> subdomains

  for (const domain of input.domains) {
    const cleanDomain = domain
      .replace(/^@@\|\|/, "")
      .replace(/\^+$/, "")
      .trim();
    const rootDomain = getRootDomain(cleanDomain);
    rootDomains.add(rootDomain);

    if (!domainMap.has(rootDomain)) {
      domainMap.set(rootDomain, []);
    }
    if (cleanDomain !== rootDomain) {
      domainMap.get(rootDomain)!.push(cleanDomain);
    }
  }

  const rootArray = Array.from(rootDomains);

  return {
    message: `Unblock ${rootArray.length} root domain${rootArray.length > 1 ? "s" : ""}?`,
    info: rootArray.map((root) => {
      const subs = domainMap.get(root) || [];
      const value = subs.length > 0 ? `${root} (includes ${subs.join(", ")})` : root;
      return {
        name: "Will unblock",
        value,
      };
    }),
    style: Action.Style.Regular,
  };
};
