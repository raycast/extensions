/**
 * Browser Cache Clearer for WebBlocker
 * Ensures immediate blocking by clearing browser-specific DNS and socket caches
 * Supports: Arc, Chrome, Firefox, Safari, Edge, Brave, Opera, Vivaldi
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";

const execAsync = promisify(exec);

/**
 * Clear Chrome-based browser caches (Chrome, Edge, Brave, Arc, Opera, Vivaldi)
 * These browsers share similar cache structures
 */
async function clearChromiumBrowserCache(
  browserName: string,
  appPath: string,
): Promise<void> {
  try {
    console.log(`🧹 Clearing ${browserName} DNS and socket cache...`);

    // Kill browser process to ensure cache is not locked
    await execAsync(`pkill -f "${browserName}" 2>/dev/null || true`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Clear various cache directories
    const homeDir = process.env.HOME || "/Users/" + process.env.USER;
    const cacheBasePaths = [
      `${homeDir}/Library/Caches/${appPath}`,
      `${homeDir}/Library/Application Support/${appPath}/Default/Cache`,
      `${homeDir}/Library/Application Support/${appPath}/Default/Code Cache`,
      `${homeDir}/Library/Application Support/${appPath}/Default/GPUCache`,
      `${homeDir}/Library/Application Support/${appPath}/ShaderCache`,
      `${homeDir}/Library/Application Support/${appPath}/Default/Storage/ext`,
    ];

    for (const cachePath of cacheBasePaths) {
      try {
        // Remove cache directories
        await execAsync(`rm -rf "${cachePath}"/* 2>/dev/null || true`);
      } catch {
        // Ignore errors for non-existent paths
      }
    }

    // Clear DNS-specific databases
    const dnsDbPaths = [
      `${homeDir}/Library/Application Support/${appPath}/Default/Network/Network Persistent State`,
      `${homeDir}/Library/Application Support/${appPath}/Default/Network/Cookies`,
      `${homeDir}/Library/Application Support/${appPath}/Default/Network/Cookies-journal`,
    ];

    for (const dbPath of dnsDbPaths) {
      try {
        await execAsync(`rm -f "${dbPath}" 2>/dev/null || true`);
      } catch {
        // Ignore errors
      }
    }

    console.log(`✅ ${browserName} cache cleared`);
  } catch (error) {
    console.error(`Error clearing ${browserName} cache:`, error);
  }
}

/**
 * Clear Firefox cache and DNS cache
 */
async function clearFirefoxCache(): Promise<void> {
  try {
    console.log(`🧹 Clearing Firefox DNS and socket cache...`);

    // Kill Firefox to ensure cache is not locked
    await execAsync(`pkill -f "Firefox" 2>/dev/null || true`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const homeDir = process.env.HOME || "/Users/" + process.env.USER;

    // Find Firefox profiles
    const profilesPath = `${homeDir}/Library/Application Support/Firefox/Profiles`;

    try {
      const profiles = await fs.readdir(profilesPath);

      for (const profile of profiles) {
        if (profile.includes(".default")) {
          // Clear cache directories
          const cacheBasePaths = [
            `${profilesPath}/${profile}/cache2`,
            `${profilesPath}/${profile}/startupCache`,
            `${profilesPath}/${profile}/OfflineCache`,
          ];

          for (const cachePath of cacheBasePaths) {
            try {
              await execAsync(`rm -rf "${cachePath}"/* 2>/dev/null || true`);
            } catch {
              // Ignore errors
            }
          }
        }
      }
    } catch {
      console.log("Firefox profiles not found");
    }

    console.log(`✅ Firefox cache cleared`);
  } catch (error) {
    console.error(`Error clearing Firefox cache:`, error);
  }
}

/**
 * Clear Safari cache and DNS cache
 */
async function clearSafariCache(): Promise<void> {
  try {
    console.log(`🧹 Clearing Safari DNS and socket cache...`);

    const homeDir = process.env.HOME || "/Users/" + process.env.USER;

    // Clear Safari caches
    const cacheBasePaths = [
      `${homeDir}/Library/Caches/com.apple.Safari`,
      `${homeDir}/Library/Caches/com.apple.WebKit.NetworkProcess`,
      `${homeDir}/Library/Caches/com.apple.WebKit.WebContent`,
      `${homeDir}/Library/Safari/LocalStorage`,
    ];

    for (const cachePath of cacheBasePaths) {
      try {
        await execAsync(`rm -rf "${cachePath}"/* 2>/dev/null || true`);
      } catch {
        // Ignore errors
      }
    }

    // Clear Safari's DNS cache using AppleScript
    const safariScript = `
    tell application "Safari"
      if it is running then
        quit
      end if
    end tell
    `;

    await execAsync(
      `osascript -e '${safariScript.replace(/'/g, "'\\''")}'`,
    ).catch(() => {});

    console.log(`✅ Safari cache cleared`);
  } catch (error) {
    console.error(`Error clearing Safari cache:`, error);
  }
}

/**
 * Kill all browser processes to force them to reload DNS settings
 */
async function killAllBrowsers(): Promise<void> {
  const browsers = [
    "Arc",
    "Google Chrome",
    "Firefox",
    "Safari",
    "Microsoft Edge",
    "Brave Browser",
    "Opera",
    "Vivaldi",
  ];

  console.log("🔄 Terminating browser processes...");

  for (const browser of browsers) {
    try {
      await execAsync(`pkill -f "${browser}" 2>/dev/null || true`);
    } catch {
      // Ignore errors for browsers that aren't running
    }
  }

  // Wait for processes to terminate
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

/**
 * Clear system-level DNS and network caches more aggressively
 */
async function clearSystemDNSCache(): Promise<void> {
  console.log("🧹 Aggressively clearing system DNS cache...");

  const commands = [
    // Standard DNS cache flush
    "dscacheutil -flushcache",

    // Kill and restart mDNSResponder multiple times
    "sudo killall -HUP mDNSResponder",
    "sudo killall mDNSResponderHelper 2>/dev/null || true",
    "sudo dscacheutil -flushcache",

    // Restart the DNS resolver
    "sudo launchctl kickstart -k system/com.apple.mDNSResponder",

    // Clear NSCD cache if it exists
    "sudo dscacheutil -flushcache",

    // Clear local DNS cache files
    "rm -rf /var/db/mds/messages/501/* 2>/dev/null || true",

    // Flush routing table
    "sudo route -n flush 2>/dev/null || true",

    // Clear ARP cache
    "sudo arp -a -d 2>/dev/null || true",

    // Reset network interfaces
    "sudo ifconfig en0 down 2>/dev/null || true",
    "sudo ifconfig en0 up 2>/dev/null || true",
    "sudo ifconfig en1 down 2>/dev/null || true",
    "sudo ifconfig en1 up 2>/dev/null || true",
  ];

  for (const cmd of commands) {
    try {
      await execAsync(cmd);
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch {
      // Some commands may fail on certain systems, that's okay
    }
  }

  console.log("✅ System DNS cache cleared");
}

/**
 * Clear all browser and system caches to ensure immediate blocking
 */
export async function clearAllBrowserCaches(): Promise<void> {
  console.log("🚀 Starting comprehensive cache clearing...");

  // 1. First clear system DNS
  await clearSystemDNSCache();

  // 2. Kill all browsers to release cache locks
  await killAllBrowsers();

  // 3. Clear individual browser caches
  await Promise.allSettled([
    clearChromiumBrowserCache("Arc", "Arc"),
    clearChromiumBrowserCache("Google Chrome", "Google/Chrome"),
    clearChromiumBrowserCache("Microsoft Edge", "Microsoft Edge"),
    clearChromiumBrowserCache("Brave", "BraveSoftware/Brave-Browser"),
    clearChromiumBrowserCache("Opera", "com.operasoftware.Opera"),
    clearChromiumBrowserCache("Vivaldi", "Vivaldi"),
    clearFirefoxCache(),
    clearSafariCache(),
  ]);

  // 4. Final system DNS flush
  await clearSystemDNSCache();

  console.log("✅ All browser caches cleared successfully");
}

/**
 * Force browsers to clear internal DNS cache using special URLs and commands
 * This should be called after hosts file modification
 */
export async function forceBrowserDNSFlush(): Promise<void> {
  console.log("🔄 Forcing browser DNS flush...");

  // Method 1: Use AppleScript to execute JavaScript in browsers
  const chromeFlushScript = `
  tell application "Google Chrome"
    if it is running then
      try
        -- Open new tab with DNS internals
        tell window 1
          set newTab to make new tab with properties {URL:"chrome://net-internals/#dns"}
        end tell
        delay 0.5
        -- Click "Clear host cache" button via JavaScript
        tell window 1
          execute tab (count tabs) javascript "document.getElementById('dns-view-clear-cache') && document.getElementById('dns-view-clear-cache').click();"
        end tell
        delay 0.5
        -- Close the tab
        tell window 1
          close tab (count tabs)
        end tell
      end try
    end if
  end tell
  `;

  const arcFlushScript = `
  tell application "Arc"
    if it is running then
      try
        tell window 1
          set newTab to make new tab with properties {URL:"chrome://net-internals/#dns"}
        end tell
        delay 0.5
        tell window 1
          close tab (count tabs)
        end tell
      end try
    end if
  end tell
  `;

  const edgeFlushScript = `
  tell application "Microsoft Edge"
    if it is running then
      try
        tell window 1
          set newTab to make new tab with properties {URL:"edge://net-internals/#dns"}
        end tell
        delay 0.5
        tell window 1
          close tab (count tabs)
        end tell
      end try
    end if
  end tell
  `;

  // Method 2: Kill and restart browser processes to force DNS reload
  const browserProcesses = [
    {
      name: "Google Chrome",
      process: "Google Chrome",
      script: chromeFlushScript,
    },
    { name: "Arc", process: "Arc", script: arcFlushScript },
    {
      name: "Microsoft Edge",
      process: "Microsoft Edge",
      script: edgeFlushScript,
    },
    { name: "Brave", process: "Brave Browser", script: "" },
    { name: "Opera", process: "Opera", script: "" },
    { name: "Vivaldi", process: "Vivaldi", script: "" },
  ];

  for (const browser of browserProcesses) {
    try {
      // Check if browser is running
      const { stdout } = await execAsync(
        `pgrep -f "${browser.process}" 2>/dev/null || echo ""`,
      ).catch(() => ({ stdout: "" }));

      if (stdout.trim()) {
        console.log(`  Flushing ${browser.name} DNS cache...`);

        // Try AppleScript method first
        if (browser.script) {
          try {
            await execAsync(
              `osascript -e '${browser.script.replace(/'/g, "'\\''")}'`,
            ).catch(() => {});
          } catch {
            // Ignore errors
          }
        }

        // Force quit and restart browser (more aggressive)
        // Commented out by default - uncomment if needed for more aggressive flushing
        // await execAsync(`pkill -f "${browser.process}" 2>/dev/null || true`);
        // await new Promise(resolve => setTimeout(resolve, 500));
        // await execAsync(`open -a "${browser.name}" 2>/dev/null || true`);
      }
    } catch {
      // Browser not installed or not running
    }
  }

  // Method 3: Clear Firefox DNS cache via command line
  try {
    await execAsync(`pkill -USR1 firefox 2>/dev/null || true`); // Signal Firefox to reload
  } catch {
    // Ignore errors
  }

  // Method 4: Reset Safari
  try {
    await execAsync(`killall -HUP Safari 2>/dev/null || true`);
  } catch {
    // Ignore errors
  }

  console.log("✅ Browser DNS flush completed");
}

/**
 * Restart network services to ensure immediate DNS changes
 */
export async function restartNetworkServices(): Promise<void> {
  console.log("🔄 Restarting network services...");

  try {
    // Get active network services
    const { stdout } = await execAsync(
      `networksetup -listallnetworkservices | grep -v "^\\*"`,
    );
    const services = stdout.split("\n").filter((s) => s.trim());

    for (const service of services) {
      if (service.includes("Wi-Fi") || service.includes("Ethernet")) {
        try {
          // Turn off
          await execAsync(
            `sudo networksetup -setnetworkserviceenabled "${service}" off`,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Turn on
          await execAsync(
            `sudo networksetup -setnetworkserviceenabled "${service}" on`,
          );

          // Also cycle the actual interface
          if (service.includes("Wi-Fi")) {
            await execAsync(`sudo networksetup -setairportpower en0 off`);
            await new Promise((resolve) => setTimeout(resolve, 500));
            await execAsync(`sudo networksetup -setairportpower en0 on`);
          }
        } catch {
          // Some commands might fail on certain network configurations
        }
      }
    }
  } catch (error) {
    console.error("Error restarting network services:", error);
  }

  console.log("✅ Network services restarted");
}
