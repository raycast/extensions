"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableBlocking = void 0;
exports.forceBrowserInternalDNSClear = forceBrowserInternalDNSClear;
exports.enableEnhancedBlocking = enableEnhancedBlocking;
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const browserRefresher_1 = require("./browserRefresher");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const HOSTS_FILE_PATH = "/etc/hosts";
const REDIRECT_IP = "127.0.0.1";
const WEBLOCKER_TAG = "# WebBlocker";
function extractDomain(input) {
    let domain = input.toLowerCase().trim();
    domain = domain.replace(/^[a-z]+:\/\//, "");
    domain = domain.split("/")[0];
    domain = domain.split("?")[0];
    domain = domain.split("#")[0];
    domain = domain.split(":")[0];
    return domain;
}
function generateDomainVariations(domain) {
    const cleanDomain = extractDomain(domain);
    const variations = new Set();
    variations.add(cleanDomain);
    if (!cleanDomain.startsWith("www.")) {
        variations.add(`www.${cleanDomain}`);
    }
    else {
        variations.add(cleanDomain.replace(/^www\./, ""));
    }
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
async function createEnhancedBlockingScript(domains) {
    const allDomainVariations = [];
    domains.forEach((domain) => {
        const variations = generateDomainVariations(domain);
        allDomainVariations.push(...variations);
    });
    const uniqueDomains = Array.from(new Set(allDomainVariations));
    const domainEntries = uniqueDomains
        .map((domain) => `echo "${REDIRECT_IP} ${domain} ${WEBLOCKER_TAG}" >> "${HOSTS_FILE_PATH}"`)
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
async function forceBrowserInternalDNSClear() {
    console.log("🔄 Forcing browser internal DNS clear...");
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
              if (document.querySelector('button[data-l10n-id=\"about-networking-dns-clear-cache-button\"]')) {
                document.querySelector('button[data-l10n-id=\"about-networking-dns-clear-cache-button\"]').click();
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
        await execAsync(`osascript -e '${browserDNSClearScript.replace(/'/g, "'\\''")}'`);
        console.log("✅ Browser internal DNS cleared");
    }
    catch (error) {
        console.error("Error clearing browser DNS:", error);
    }
}
async function enableEnhancedBlocking(domains) {
    if (!domains || domains.length === 0) {
        return {
            success: false,
            message: "No domains provided to block",
        };
    }
    try {
        console.log("🚀 Starting enhanced blocking process...");
        console.log(`🚫 Closing tabs for ${domains.length} blocked domain(s)...`);
        await (0, browserRefresher_1.closeBlockedTabs)(domains).catch((err) => {
            console.error("Error closing tabs:", err);
        });
        console.log("🧹 Clearing browser internal DNS caches...");
        await forceBrowserInternalDNSClear().catch((err) => {
            console.log("Browser DNS clear failed (non-critical):", err.message);
        });
        console.log("📝 Applying enhanced blocking to hosts file...");
        const scriptContent = await createEnhancedBlockingScript(domains);
        const tempScriptPath = "/tmp/webblocker_enhanced.sh";
        await fs.writeFile(tempScriptPath, scriptContent);
        await execAsync(`chmod +x ${tempScriptPath}`);
        const applescriptCmd = `osascript -e 'do shell script "${tempScriptPath}" with administrator privileges'`;
        await execAsync(applescriptCmd);
        await execAsync(`rm -f ${tempScriptPath}`);
        console.log("🔄 Final browser DNS cache clear...");
        await forceBrowserInternalDNSClear().catch((err) => {
            console.log("Final browser DNS clear failed (non-critical):", err.message);
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
            success: true,
            message: `✅ Successfully blocked ${domains.length} website(s) with IMMEDIATE effect!`,
        };
    }
    catch (error) {
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
exports.enableBlocking = enableEnhancedBlocking;
//# sourceMappingURL=enhancedHostsManager.js.map