/**
 * Enhanced Hosts Manager for WebBlocker
 * Ensures immediate blocking without killing browsers
 * Uses multiple techniques to bypass DNS caching
 */

import * as fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { closeBlockedTabs } from "./browserRefresher";

const execAsync = promisify(exec);

// Constants
const HOSTS_FILE_PATH = "/etc/hosts";
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
 * Generate all possible domain variations for complete blocking
 */
function generateDomainVariations(domain: string): string[] {
  const cleanDomain = extractDomain(domain);
  const variations = new Set<string>();

  // Add base domain
  variations.add(cleanDomain);

  // Add www version
  if (!cleanDomain.startsWith("www.")) {
    variations.add(`www.${cleanDomain}`);
  } else {
    variations.add(cleanDomain.replace(/^www\./, ""));
  }

  // Add common subdomains
  const commonSubdomains = [
    "m",
    "mobile",
    "app",
    "api",
    "cdn",
    "static",
    "assets",
  ];
  const baseDomain = cleanDomain.replace(/^www\./, "");

  for (const subdomain of commonSubdomains) {
    variations.add(`${subdomain}.${baseDomain}`);
  }

  // Add with different TLDs if it's a .com domain
  if (baseDomain.endsWith(".com")) {
    const domainWithoutTLD = baseDomain.slice(0, -4);
    const alternateTLDs = [".net", ".org", ".co", ".io"];
    for (const tld of alternateTLDs) {
      variations.add(`${domainWithoutTLD}${tld}`);
      variations.add(`www.${domainWithoutTLD}${tld}`);
    }
  }

  return Array.from(variations);
}

/**
 * Create enhanced blocking script with multiple DNS bypass techniques
 */
async function createEnhancedBlockingScript(
  domains: string[],
): Promise<string> {
  // Generate all domain variations
  const allDomainVariations: string[] = [];
  domains.forEach((domain) => {
    const variations = generateDomainVariations(domain);
    allDomainVariations.push(...variations);
  });

  // Remove duplicates
  const uniqueDomains = Array.from(new Set(allDomainVariations));

  // Create hosts entries
  const domainEntries = uniqueDomains
    .map(
      (domain) =>
        `echo "${REDIRECT_IP} ${domain} ${WEBLOCKER_TAG}" >> "${HOSTS_FILE_PATH}"`,
    )
    .join("\n");

  return `#!/bin/bash
# Enhanced WebBlocker Script - Ensures IMMEDIATE blocking
# Using safer commands that won't fail

echo "🚫 Starting enhanced website blocking..."

# 1. Backup hosts file if needed
if [ ! -f "${HOSTS_FILE_PATH}.backup" ]; then
    cp "${HOSTS_FILE_PATH}" "${HOSTS_FILE_PATH}.backup" || true
fi

# 2. Add blocking entries to hosts file
echo "📝 Adding ${uniqueDomains.length} domain variations to hosts file..."
echo "" >> "${HOSTS_FILE_PATH}"
echo "# WebBlocker - Added by Raycast WebBlocker Extension" >> "${HOSTS_FILE_PATH}"
${domainEntries}

# 3. Clear DNS caches - Multiple rounds for reliability
echo "🧹 Clearing DNS caches..."
dscacheutil -flushcache 2>/dev/null || true
killall -HUP mDNSResponder 2>/dev/null || true
killall mDNSResponderHelper 2>/dev/null || true
dscacheutil -flushcache 2>/dev/null || true

# 4. Restart DNS resolver
echo "🔄 Restarting DNS resolver..."
launchctl kickstart -k system/com.apple.mDNSResponder 2>/dev/null || true
sleep 1

# 5. Clear local DNS cache files
echo "🧹 Removing DNS cache files..."
rm -rf /var/db/mds/messages/501/* 2>/dev/null || true

# 6. Final DNS flush
echo "🧹 Final DNS cache flush..."
dscacheutil -flushcache 2>/dev/null || true
killall -HUP mDNSResponder 2>/dev/null || true
sleep 1
dscacheutil -flushcache 2>/dev/null || true

echo "🎉 Enhanced blocking enabled successfully!"
echo "Blocked domains: ${domains.join(", ")}"
echo ""
echo "⚡ Blocking is now active!"
`;
}

/**
 * Force browser internal DNS cache clear without killing browsers
 */
export async function forceBrowserInternalDNSClear(): Promise<void> {
  console.log("🔄 Forcing browser internal DNS clear...");

  // Use AppleScript to navigate browsers to internal DNS clear pages
  const browserDNSClearScript = `
  on clearBrowserDNS(browserName, clearURL)
    try
      tell application browserName
        if it is running then
          -- Open DNS clear page in background tab
          if browserName is "Safari" then
            tell window 1
              set newTab to make new tab
              set URL of newTab to clearURL
              delay 2
              -- Safari doesn't have chrome://net-internals, so just close
              close newTab
            end tell
          else
            tell window 1
              set newTab to (make new tab with properties {URL:clearURL})
              delay 2
              -- Try to click clear button if possible
              try
                tell active tab
                  execute javascript "
                    // Clear DNS cache
                    if (document.querySelector('#sockets-view-flush-button')) {
                      document.querySelector('#sockets-view-flush-button').click();
                    }
                    if (document.querySelector('#dns-view-clear-cache')) {
                      document.querySelector('#dns-view-clear-cache').click();
                    }
                    // Clear sockets
                    if (document.querySelector('#sockets-view-close-idle-button')) {
                      document.querySelector('#sockets-view-close-idle-button').click();
                    }
                  "
                end tell
              end try
              delay 1
              close newTab
            end tell
          end if
        end if
      end tell
    end try
  end clearBrowserDNS
  
  -- Clear DNS for all supported browsers
  clearBrowserDNS("Google Chrome", "chrome://net-internals/#dns")
  clearBrowserDNS("Google Chrome", "chrome://net-internals/#sockets")
  clearBrowserDNS("Arc", "chrome://net-internals/#dns")
  clearBrowserDNS("Arc", "chrome://net-internals/#sockets")
  clearBrowserDNS("Microsoft Edge", "edge://net-internals/#dns")
  clearBrowserDNS("Microsoft Edge", "edge://net-internals/#sockets")
  clearBrowserDNS("Brave Browser", "brave://net-internals/#dns")
  clearBrowserDNS("Brave Browser", "brave://net-internals/#sockets")
  clearBrowserDNS("Opera", "opera://net-internals/#dns")
  clearBrowserDNS("Opera", "opera://net-internals/#sockets")
  clearBrowserDNS("Vivaldi", "vivaldi://net-internals/#dns")
  clearBrowserDNS("Vivaldi", "vivaldi://net-internals/#sockets")
  
  -- For Firefox, we need to use about:networking
  try
    tell application "Firefox"
      if it is running then
        tell window 1
          set newTab to make new tab
          set URL of newTab to "about:networking#dns"
          delay 2
          -- Try to clear via JavaScript
          try
            execute javascript "
              // Firefox DNS clear
              if (document.querySelector('button[data-l10n-id="about-networking-dns-clear-cache-button"]')) {
                document.querySelector('button[data-l10n-id="about-networking-dns-clear-cache-button"]').click();
              }
            " in newTab
          end try
          delay 1
          close newTab
        end tell
      end if
    end tell
  end try
  
  -- Safari special handling
  try
    tell application "Safari"
      if it is running then
        -- Safari doesn't have internal DNS clear, but we can force a reload
        tell window 1
          -- Create and close a tab to force cache clear
          set dummyTab to make new tab with properties {URL:"about:blank"}
          delay 1
          close dummyTab
        end tell
      end if
    end tell
  end try
  `;

  try {
    await execAsync(
      `osascript -e '${browserDNSClearScript.replace(/'/g, "'\\''")}'`,
    );
    console.log("✅ Browser internal DNS cleared");
  } catch (error) {
    console.error("Error clearing browser DNS:", error);
  }
}

/**
 * Enable blocking with enhanced immediate effect
 */
export async function enableEnhancedBlocking(
  domains: string[],
): Promise<{ success: boolean; message: string }> {
  if (!domains || domains.length === 0) {
    return {
      success: false,
      message: "No domains provided to block",
    };
  }

  try {
    console.log("🚀 Starting enhanced blocking process...");

    // Step 1: Close blocked tabs first
    console.log(`🚫 Closing tabs for ${domains.length} blocked domain(s)...`);
    await closeBlockedTabs(domains).catch((err) => {
      console.error("Error closing tabs:", err);
    });

    // Step 2: Force browser internal DNS clear BEFORE applying blocking (optional, may fail)
    console.log("🧹 Clearing browser internal DNS caches...");
    await forceBrowserInternalDNSClear().catch((err) => {
      console.log("Browser DNS clear failed (non-critical):", err.message);
    });

    // Step 3: Create and execute enhanced blocking script
    console.log("📝 Applying enhanced blocking to hosts file...");
    const scriptContent = await createEnhancedBlockingScript(domains);
    const tempScriptPath = "/tmp/webblocker_enhanced.sh";

    await fs.writeFile(tempScriptPath, scriptContent);
    await execAsync(`chmod +x ${tempScriptPath}`);

    // Execute with admin privileges (single password prompt)
    const applescriptCmd = `osascript -e 'do shell script "${tempScriptPath}" with administrator privileges'`;
    await execAsync(applescriptCmd);

    // Clean up
    await execAsync(`rm -f ${tempScriptPath}`);

    // Step 4: Force another browser DNS clear AFTER blocking (optional, may fail)
    console.log("🔄 Final browser DNS cache clear...");
    await forceBrowserInternalDNSClear().catch((err) => {
      console.log(
        "Final browser DNS clear failed (non-critical):",
        err.message,
      );
    });

    // Step 5: Wait a moment for changes to propagate
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      message: `✅ Successfully blocked ${domains.length} website(s) with IMMEDIATE effect!`,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
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

/**
 * Export for compatibility with existing code
 */
export const enableBlocking = enableEnhancedBlocking;
