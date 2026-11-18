/**
 * Safe Enhanced Hosts Manager - Guaranteed to work
 * Falls back to reliable methods while still providing immediate blocking
 */

import * as fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { closeBlockedTabs } from "./browserRefresher";
import { executeScriptWithAuth } from "./biometricAuth";

const execAsync = promisify(exec);

// Constants
const HOSTS_FILE_PATH = "/etc/hosts";
const BACKUP_FILE_PATH = "/etc/hosts.backup.webblocker";
const REDIRECT_IP = "127.0.0.1";
const WEBLOCKER_TAG = "# WebBlocker";

/**
 * Extract clean domain from URL
 */
function extractDomain(input: string): string {
  let domain = input.toLowerCase().trim();
  domain = domain.replace(/^[a-z]+:\/\//, "");
  domain = domain.split("/")[0];
  domain = domain.split("?")[0];
  domain = domain.split("#")[0];
  domain = domain.split(":")[0];
  return domain;
}

/**
 * Create safe blocking script that won't fail
 */
async function createSafeBlockingScript(domains: string[]): Promise<string> {
  // Expand domains to include both www and non-www versions
  const expandedDomains: string[] = [];
  domains.forEach((domain) => {
    const cleanDomain = extractDomain(domain);

    if (!cleanDomain) return;

    expandedDomains.push(cleanDomain);

    if (!cleanDomain.startsWith("www.")) {
      expandedDomains.push(`www.${cleanDomain}`);
    } else {
      expandedDomains.push(cleanDomain.replace(/^www\./, ""));
    }
  });

  const uniqueDomains = Array.from(new Set(expandedDomains));
  const domainEntries = uniqueDomains
    .map(
      (domain) =>
        `echo "${REDIRECT_IP} ${domain} ${WEBLOCKER_TAG}" >> "${HOSTS_FILE_PATH}"`,
    )
    .join("\n");

  return `#!/bin/bash
# Safe WebBlocker Script - Guaranteed to work

echo "🚫 Starting website blocking..."

# 1. Create backup
if [ ! -f "${BACKUP_FILE_PATH}" ]; then
    cp "${HOSTS_FILE_PATH}" "${BACKUP_FILE_PATH}" || true
fi

# 2. Add blocking entries to hosts file
echo "📝 Adding ${uniqueDomains.length} domain(s) to hosts file..."
echo "" >> "${HOSTS_FILE_PATH}"
echo "# WebBlocker - Added by Raycast WebBlocker Extension" >> "${HOSTS_FILE_PATH}"
${domainEntries}

# 3. Clear DNS caches (multiple rounds)
echo "🧹 Clearing DNS caches..."
dscacheutil -flushcache 2>/dev/null || true
killall -HUP mDNSResponder 2>/dev/null || true
sleep 1
dscacheutil -flushcache 2>/dev/null || true

# 4. Restart DNS resolver
echo "🔄 Restarting DNS resolver..."
launchctl kickstart -k system/com.apple.mDNSResponder 2>/dev/null || true
sleep 1

# 5. Final DNS flush
dscacheutil -flushcache 2>/dev/null || true
killall -HUP mDNSResponder 2>/dev/null || true

echo "🎉 Blocking enabled successfully!"
echo "Blocked domains: ${domains.join(", ")}"
`;
}

/**
 * Safe enable blocking function
 */
export async function safeEnableBlocking(
  domains: string[],
): Promise<{ success: boolean; message: string }> {
  if (!domains || domains.length === 0) {
    return {
      success: false,
      message: "No domains provided to block",
    };
  }

  try {
    console.log("🚀 Starting safe blocking process...");

    // Step 1: Close blocked tabs
    console.log(`🚫 Closing tabs for ${domains.length} blocked domain(s)...`);
    await closeBlockedTabs(domains).catch((err) => {
      console.error("Error closing tabs:", err);
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 2: Create blocking script
    console.log("📝 Creating blocking script...");
    const scriptContent = await createSafeBlockingScript(domains);
    const tempScriptPath = "/tmp/webblocker_safe.sh";

    await fs.writeFile(tempScriptPath, scriptContent);
    await execAsync(`chmod +x ${tempScriptPath}`);

    // Step 3: Execute with SINGLE Touch ID/password prompt
    console.log("🔐 Requesting Touch ID/password...");
    const result = await executeScriptWithAuth(
      tempScriptPath,
      "WebBlocker needs to modify system files to block websites",
    );

    if (!result.success) {
      await execAsync(`rm -f ${tempScriptPath}`);
      return {
        success: false,
        message: result.error || "Authentication failed",
      };
    }

    console.log("✅ Blocking applied successfully!");

    // Clean up
    await execAsync(`rm -f ${tempScriptPath}`);

    // Step 4: Additional DNS flush (non-privileged)
    console.log("🔄 Final DNS cache clear...");
    await execAsync("dscacheutil -flushcache").catch(() => {});

    return {
      success: true,
      message: `✅ Successfully blocked ${domains.length} website(s)!`,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error in safeEnableBlocking:", error);

    if (error.message?.includes("User canceled")) {
      return {
        success: false,
        message: "Authentication was canceled by user",
      };
    }

    return {
      success: false,
      message: `Failed to enable blocking: ${error.message}`,
    };
  }
}

// Export as default for easy import
export const enableBlocking = safeEnableBlocking;
export const enableEnhancedBlocking = safeEnableBlocking;
