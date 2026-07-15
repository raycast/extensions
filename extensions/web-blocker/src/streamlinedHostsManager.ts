/**
 * Streamlined Hosts Manager for WebBlocker
 * Uses password caching and smart browser detection for maximum effectiveness
 */

import * as fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import PasswordManager from "./passwordManager";
import { closeBlockedTabs } from "./browserRefresher";
import {
  clearAllBrowserCaches,
  forceBrowserDNSFlush,
  restartNetworkServices,
} from "./browserCacheClearer";
import { executeScriptWithAuth } from "./biometricAuth";

const execAsync = promisify(exec);

// Constants
const HOSTS_FILE_PATH = "/etc/hosts";
const BACKUP_FILE_PATH = "/etc/hosts.webblocker.bak";
const WEBGLOCKER_TAG = "# WebBlocker";
const REDIRECT_IP = "127.0.0.1";
const PF_ANCHOR_NAME = "com.webblocker.blocking";

export interface BlockingResult {
  success: boolean;
  message: string;
  browsersRestarted?: string[];
}

/**
 * Creates a comprehensive blocking script that handles everything in one go
 * @param domains - Array of domains to block
 * @returns Promise resolving to script content
 */
/**
 * Extracts just the domain name from a URL or domain string
 * Removes protocols, paths, query strings, and ports
 */
function extractDomain(input: string): string {
  let domain = input.toLowerCase().trim();

  // Remove protocol (http://, https://, etc.)
  domain = domain.replace(/^[a-z]+:\/\//, "");

  // Remove everything after the first slash (paths)
  domain = domain.split("/")[0];

  // Remove everything after ? (query strings)
  domain = domain.split("?")[0];

  // Remove everything after # (anchors)
  domain = domain.split("#")[0];

  // Remove port numbers
  domain = domain.split(":")[0];

  return domain;
}

async function createBlockingScript(domains: string[]): Promise<string> {
  // Expand domains to include both www and non-www versions
  const expandedDomains: string[] = [];
  domains.forEach((domain) => {
    // Extract clean domain (remove paths, protocols, etc.)
    const cleanDomain = extractDomain(domain);

    if (!cleanDomain) return; // Skip empty domains

    // Add the domain as-is
    expandedDomains.push(cleanDomain);

    // Add www version if not already present
    if (!cleanDomain.startsWith("www.")) {
      expandedDomains.push(`www.${cleanDomain}`);
    } else {
      // If it starts with www., also add non-www version
      expandedDomains.push(cleanDomain.replace(/^www\./, ""));
    }
  });

  // Remove duplicates
  const uniqueDomains = Array.from(new Set(expandedDomains));

  const domainEntries = uniqueDomains
    .map(
      (domain) =>
        `echo "${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}" >> "${HOSTS_FILE_PATH}"`,
    )
    .join("\n");

  // Helper: generate a function to briefly toggle active network services to drop existing connections
  const networkRefresh = `
# Function: return active network service names
get_active_services() {
  networksetup -listnetworkserviceorder | awk '
    /([0-9]+) / { svc=$0; sub(/^([0-9]+) /, "", svc); getline; if (match($0, /Device: ([^)]+)/, m)) { dev=m[1]; printf "%s|%s\n", svc, dev; } }
  ' | while IFS='|' read -r svc dev; do
      if ifconfig "$dev" 2>/dev/null | grep -q "status: active"; then
        echo "$svc"
      fi
    done
}

# Briefly disable/enable each active network service to force reconnects
for svc in $(get_active_services); do
  echo "🔁 Cycling network service: $svc"
  networksetup -setnetworkserviceenabled "$svc" off 2>/dev/null || true
  sleep 1
  networksetup -setnetworkserviceenabled "$svc" on 2>/dev/null || true
  sleep 1
done
`;

  return `#!/bin/bash
# WebBlocker comprehensive blocking script with aggressive DNS flushing

# Error handling - continue on errors but log them
set +e

log_error() {
  echo "⚠️ Warning: $1 (continuing...)"
}

echo "🚫 Starting comprehensive website blocking..."

# 0. AGGRESSIVE PRE-FLUSH before modifying hosts file
echo "🧹 Step 1/5: Pre-flushing ALL DNS caches..."

# System DNS flush (multiple attempts)
for i in {1..3}; do
  dscacheutil -flushcache 2>/dev/null || log_error "dscacheutil flush attempt $i failed"
  killall -HUP mDNSResponder 2>/dev/null || log_error "mDNSResponder restart attempt $i failed"
  sleep 0.5
done

# Kill all DNS-related processes
killall mDNSResponderHelper 2>/dev/null || true
killall mDNSResponder 2>/dev/null || true

# Restart mDNSResponder service
launchctl kickstart -k system/com.apple.mDNSResponder 2>/dev/null || log_error "launchctl kickstart failed"

# Clear system DNS cache directories
rm -rf /var/db/mds/messages/501/* 2>/dev/null || true
rm -rf /Library/Caches/com.apple.mDNSResponder/* 2>/dev/null || true

# Flush network tables
route -n flush 2>/dev/null || log_error "route flush failed"
arp -a -d 2>/dev/null || log_error "arp flush failed"

echo "✅ Pre-flush completed"

# 1. Create backup if it doesn't exist
echo "📦 Step 2/5: Creating backup..."
if [ ! -f "${BACKUP_FILE_PATH}" ]; then
    cp "${HOSTS_FILE_PATH}" "${BACKUP_FILE_PATH}" 2>/dev/null || log_error "backup creation failed"
    echo "✅ Backup created at ${BACKUP_FILE_PATH}"
else
    echo "✅ Backup already exists"
fi

# 2. Add domain entries to hosts file
echo "📝 Step 3/5: Adding ${domains.length} domain(s) to hosts file..."
echo "" >> "${HOSTS_FILE_PATH}"
echo "# WebBlocker - Added by Raycast WebBlocker Extension" >> "${HOSTS_FILE_PATH}"
${domainEntries}

echo "✅ Hosts file updated"

# 3. AGGRESSIVE POST-FLUSH after modifying hosts file
echo "🧹 Step 4/5: Post-flushing DNS (ultra-aggressive)..."

# Multiple rounds of DNS flushing
for round in {1..5}; do
  echo "  Round $round/5..."
  dscacheutil -flushcache 2>/dev/null || true
  killall -HUP mDNSResponder 2>/dev/null || true
  sleep 0.3
done

# Force restart mDNSResponder
launchctl unload /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist 2>/dev/null || true
launchctl load /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist 2>/dev/null || true
launchctl kickstart -k system/com.apple.mDNSResponder 2>/dev/null || true

# Network interface reset (all active interfaces)
for iface in en0 en1 en2 en3 en4; do
  if ifconfig $iface 2>/dev/null | grep -q "status: active"; then
    echo "  Resetting $iface..."
    ifconfig $iface down 2>/dev/null || true
    sleep 0.5
    ifconfig $iface up 2>/dev/null || true
  fi
done

# Final aggressive flush
sleep 1
for i in {1..3}; do
  dscacheutil -flushcache 2>/dev/null || true
  killall -HUP mDNSResponder 2>/dev/null || true
done

echo "✅ DNS caches cleared aggressively"

# 4. Network service cycling to drop existing connections
echo "🔄 Step 5/5: Cycling network services..."
${networkRefresh}

echo "✅ Network services cycled"
echo ""
echo "🎉 Blocking enabled successfully!"
echo "Blocked domains: ${domains.join(", ")}"
`;
}

/**
 * Creates a comprehensive unblocking script
 * @returns Promise resolving to script content
 */
async function createUnblockingScript(): Promise<string> {
  return `#!/bin/bash
# WebBlocker COMPLETE unblocking script - removes ALL blocking

set -e  # Exit on any error

echo "✅ Starting complete website unblocking..."

# 1. Remove ONLY WebBlocker entries from hosts file (preserve user's custom entries)
echo "📝 Cleaning hosts file..."

# Remove only lines tagged with WebBlocker, preserve everything else
grep -v "${WEBGLOCKER_TAG}" "${HOSTS_FILE_PATH}" > /tmp/hosts_clean.txt 2>/dev/null || {
  # If grep fails (no WebBlocker entries found), just copy the original file
  cat "${HOSTS_FILE_PATH}" > /tmp/hosts_clean.txt
}

# Replace hosts file with cleaned version
cp /tmp/hosts_clean.txt "${HOSTS_FILE_PATH}"
rm /tmp/hosts_clean.txt
echo "✅ WebBlocker entries removed from hosts file!"

# 2. Remove ONLY WebBlocker PF firewall rules (preserve other firewall rules)
echo "🔥 Removing WebBlocker firewall rules..."

# Flush only WebBlocker anchor rules (not all firewall rules)
pfctl -a "${PF_ANCHOR_NAME}" -F all 2>/dev/null || true
echo "  ✓ WebBlocker anchor rules flushed"

# Clear only WebBlocker blocked IPs table
pfctl -t webblocker_blocked -T flush 2>/dev/null || true
echo "  ✓ WebBlocker IP table cleared"

# Kill connections only for WebBlocker blocked IPs (before clearing table)
pfctl -t webblocker_blocked -T show 2>/dev/null | while read ip; do
  [ -n "$ip" ] && pfctl -k "$ip" 2>/dev/null || true
done || true
echo "  ✓ WebBlocker connection states cleared"

# Remove WebBlocker from pf.conf
if [ -f /etc/pf.conf ]; then
  # Create backup
  cp /etc/pf.conf /etc/pf.conf.backup.webblocker 2>/dev/null || true
  
  # Remove all WebBlocker related lines
  grep -v "webblocker" /etc/pf.conf > /tmp/pf.conf.clean 2>/dev/null || cat /etc/pf.conf > /tmp/pf.conf.clean
  grep -v "WebBlocker" /tmp/pf.conf.clean > /tmp/pf.conf.final 2>/dev/null || cat /tmp/pf.conf.clean > /tmp/pf.conf.final
  
  cp /tmp/pf.conf.final /etc/pf.conf
  rm /tmp/pf.conf.clean /tmp/pf.conf.final
  echo "  ✓ pf.conf cleaned"
fi

# 3. Clear ALL DNS caches (multiple methods for thoroughness)
echo "🧹 Clearing all DNS caches..."
dscacheutil -flushcache 2>/dev/null || true
echo "  ✓ dscacheutil cache cleared"

killall -HUP mDNSResponder 2>/dev/null || true
echo "  ✓ mDNSResponder restarted"

discoveryutil udnsflushcaches 2>/dev/null || true
discoveryutil mdnsflushcache 2>/dev/null || true
echo "  ✓ discoveryutil cache cleared"

# Restart DNS service
launchctl kickstart -k system/com.apple.mDNSResponder 2>/dev/null || true
sleep 2

# 4. One final DNS flush
dscacheutil -flushcache 2>/dev/null || true

echo ""
echo "🎉 ================================"
echo "🎉  ALL BLOCKING REMOVED!"
echo "🎉 ================================"
echo ""
echo "✅ Hosts file cleaned"
echo "✅ WebBlocker firewall rules removed"
echo "✅ WebBlocker connection states cleared"
echo "✅ DNS caches flushed"
echo ""
echo "📌 Websites should work immediately!"
echo "📌 If not, close and reopen your browser"
echo ""
`;
}

/**
 * Enables comprehensive website blocking with single password prompt
 * @param domains - Array of domains to block
 * @returns Promise resolving to blocking result
 */
export async function enableBlocking(
  domains: string[],
): Promise<BlockingResult> {
  if (!domains || domains.length === 0) {
    return {
      success: false,
      message: "No domains provided to block",
    };
  }

  try {
    // STEP 1: Close all blocked tabs FIRST (before password prompt!)
    console.log(`🚫 Closing ${domains.length} blocked website tabs...`);
    await closeBlockedTabs(domains).catch((error) => {
      console.error("Error closing tabs:", error);
    });

    // Small delay to ensure tabs are fully closed
    await new Promise((resolve) => setTimeout(resolve, 300));

    // STEP 2: Clear ALL browser caches to ensure immediate blocking
    console.log("🧹 Clearing browser caches for immediate blocking...");
    await clearAllBrowserCaches().catch((error) => {
      console.error("Error clearing browser caches:", error);
    });

    // STEP 3: Create blocking script
    console.log("📝 Creating blocking script...");
    const scriptContent = await createBlockingScript(domains);
    const tempScriptPath = "/tmp/webblocker_enable.sh";

    // Write script to temporary file (non-privileged)
    await fs.writeFile(tempScriptPath, scriptContent);
    await execAsync(`chmod +x ${tempScriptPath}`);

    // STEP 4: Execute with SINGLE Touch ID/password prompt
    console.log("🔐 Requesting Touch ID/password...");
    const execResult = await executeScriptWithAuth(
      tempScriptPath,
      "WebBlocker needs to modify system files to block websites",
    );

    if (!execResult.success) {
      await execAsync(`rm -f ${tempScriptPath}`);
      return {
        success: false,
        message: execResult.error || "Authentication failed",
      };
    }

    console.log("✅ Blocking applied successfully!");

    // Clean up
    await execAsync(`rm -f ${tempScriptPath}`);

    // STEP 5: Force browser DNS flush to ensure immediate effect
    console.log("🔄 Forcing browser DNS flush...");
    await forceBrowserDNSFlush().catch((error) => {
      console.error("Error forcing browser DNS flush:", error);
    });

    // STEP 6: Final aggressive network restart
    console.log("🔄 Final network service restart...");
    await restartNetworkServices().catch((error) => {
      console.error("Error restarting network services:", error);
    });

    return {
      success: true,
      message: `Successfully blocked ${domains.length} website(s) with immediate effect`,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.message.includes("User canceled")) {
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

/**
 * Disables comprehensive website blocking with cached authentication
 * @returns Promise resolving to blocking result
 */
export async function disableBlocking(): Promise<BlockingResult> {
  try {
    // Get currently blocked domains before removing them (for logging/debugging)
    await getBlockedDomainsFromHosts();

    // Create the comprehensive unblocking script
    console.log("📝 Creating unblocking script...");
    const scriptContent = await createUnblockingScript();
    const tempScriptPath = "/tmp/webblocker_disable.sh";

    // Write script to temporary file (non-privileged)
    await fs.writeFile(tempScriptPath, scriptContent);
    await execAsync(`chmod +x ${tempScriptPath}`);

    // Execute with SINGLE Touch ID/password prompt
    console.log("🔐 Requesting Touch ID/password...");
    const execResult = await executeScriptWithAuth(
      tempScriptPath,
      "WebBlocker needs to modify system files to unblock websites",
    );

    if (!execResult.success) {
      await execAsync(`rm -f ${tempScriptPath}`);
      return {
        success: false,
        message: execResult.error || "Authentication failed",
      };
    }

    console.log("✅ Unblocking completed successfully!");

    // Clean up
    await execAsync(`rm -f ${tempScriptPath}`);

    // Note: We don't close tabs when disabling - users may want to reload them manually
    // Tabs will work normally after a manual refresh

    return {
      success: true,
      message: "Successfully disabled all website blocking",
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.message.includes("User canceled")) {
      return {
        success: false,
        message: "Authentication was canceled by user",
      };
    }
    return {
      success: false,
      message: `Failed to disable blocking: ${error.message}`,
    };
  }
}

/**
 * Checks if domains are currently blocked in hosts file
 * @param domains - Array of domains to check
 * @returns Promise resolving to object indicating which domains are blocked
 */
export async function checkDomainsBlocked(
  domains: string[],
): Promise<{ [domain: string]: boolean }> {
  try {
    const hostsContent = await fs.readFile(HOSTS_FILE_PATH, "utf-8");
    const result: { [domain: string]: boolean } = {};

    domains.forEach((domain) => {
      result[domain] = hostsContent.includes(
        `${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}`,
      );
    });

    return result;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error checking blocked domains:", error);
    const result: { [domain: string]: boolean } = {};
    domains.forEach((domain) => {
      result[domain] = false;
    });
    return result;
  }
}

/**
 * Gets all currently blocked domains from hosts file
 * @returns Promise resolving to array of blocked domain names
 */
export async function getBlockedDomainsFromHosts(): Promise<string[]> {
  try {
    const hostsContent = await fs.readFile(HOSTS_FILE_PATH, "utf-8");
    const lines = hostsContent.split("\n");

    const blockedDomains: string[] = [];
    lines.forEach((line) => {
      if (line.includes(WEBGLOCKER_TAG) && line.includes(REDIRECT_IP)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2 && parts[0] === REDIRECT_IP) {
          blockedDomains.push(parts[1]);
        }
      }
    });

    return blockedDomains;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error reading blocked domains from hosts file:", error);
    return [];
  }
}

/**
 * Clears the password session (useful for testing or security)
 */
export async function clearPasswordSession(): Promise<void> {
  const passwordManager = PasswordManager.getInstance();
  await passwordManager.clearSession();
}

/**
 * Gets password session info for debugging
 */
export function getPasswordSessionInfo(): {
  isValid: boolean;
  expiresIn?: number;
} {
  const passwordManager = PasswordManager.getInstance();
  return passwordManager.getSessionInfo();
}
