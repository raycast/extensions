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
exports.clearAllBrowserCaches = clearAllBrowserCaches;
exports.forceBrowserDNSFlush = forceBrowserDNSFlush;
exports.restartNetworkServices = restartNetworkServices;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function clearChromiumBrowserCache(browserName, appPath) {
    try {
        console.log(`🧹 Clearing ${browserName} DNS and socket cache...`);
        await execAsync(`pkill -f "${browserName}" 2>/dev/null || true`);
        await new Promise((resolve) => setTimeout(resolve, 500));
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
                await execAsync(`rm -rf "${cachePath}"/* 2>/dev/null || true`);
            }
            catch (error) {
            }
        }
        const dnsDbPaths = [
            `${homeDir}/Library/Application Support/${appPath}/Default/Network/Network Persistent State`,
            `${homeDir}/Library/Application Support/${appPath}/Default/Network/Cookies`,
            `${homeDir}/Library/Application Support/${appPath}/Default/Network/Cookies-journal`,
        ];
        for (const dbPath of dnsDbPaths) {
            try {
                await execAsync(`rm -f "${dbPath}" 2>/dev/null || true`);
            }
            catch (error) {
            }
        }
        console.log(`✅ ${browserName} cache cleared`);
    }
    catch (error) {
        console.error(`Error clearing ${browserName} cache:`, error);
    }
}
async function clearFirefoxCache() {
    try {
        console.log(`🧹 Clearing Firefox DNS and socket cache...`);
        await execAsync(`pkill -f "Firefox" 2>/dev/null || true`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        const homeDir = process.env.HOME || "/Users/" + process.env.USER;
        const profilesPath = `${homeDir}/Library/Application Support/Firefox/Profiles`;
        try {
            const profiles = await fs.readdir(profilesPath);
            for (const profile of profiles) {
                if (profile.includes(".default")) {
                    const cacheBasePaths = [
                        `${profilesPath}/${profile}/cache2`,
                        `${profilesPath}/${profile}/startupCache`,
                        `${profilesPath}/${profile}/OfflineCache`,
                    ];
                    for (const cachePath of cacheBasePaths) {
                        try {
                            await execAsync(`rm -rf "${cachePath}"/* 2>/dev/null || true`);
                        }
                        catch (error) {
                        }
                    }
                }
            }
        }
        catch (error) {
            console.log("Firefox profiles not found");
        }
        console.log(`✅ Firefox cache cleared`);
    }
    catch (error) {
        console.error(`Error clearing Firefox cache:`, error);
    }
}
async function clearSafariCache() {
    try {
        console.log(`🧹 Clearing Safari DNS and socket cache...`);
        const homeDir = process.env.HOME || "/Users/" + process.env.USER;
        const cacheBasePaths = [
            `${homeDir}/Library/Caches/com.apple.Safari`,
            `${homeDir}/Library/Caches/com.apple.WebKit.NetworkProcess`,
            `${homeDir}/Library/Caches/com.apple.WebKit.WebContent`,
            `${homeDir}/Library/Safari/LocalStorage`,
        ];
        for (const cachePath of cacheBasePaths) {
            try {
                await execAsync(`rm -rf "${cachePath}"/* 2>/dev/null || true`);
            }
            catch (error) {
            }
        }
        const safariScript = `
    tell application "Safari"
      if it is running then
        quit
      end if
    end tell
    `;
        await execAsync(`osascript -e '${safariScript.replace(/'/g, "'\\''")}'`).catch(() => { });
        console.log(`✅ Safari cache cleared`);
    }
    catch (error) {
        console.error(`Error clearing Safari cache:`, error);
    }
}
async function killAllBrowsers() {
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
        }
        catch (error) {
        }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
}
async function clearSystemDNSCache() {
    console.log("🧹 Aggressively clearing system DNS cache...");
    const commands = [
        "dscacheutil -flushcache",
        "sudo killall -HUP mDNSResponder",
        "sudo killall mDNSResponderHelper 2>/dev/null || true",
        "sudo dscacheutil -flushcache",
        "sudo launchctl kickstart -k system/com.apple.mDNSResponder",
        "sudo dscacheutil -flushcache",
        "rm -rf /var/db/mds/messages/501/* 2>/dev/null || true",
        "sudo route -n flush 2>/dev/null || true",
        "sudo arp -a -d 2>/dev/null || true",
        "sudo ifconfig en0 down 2>/dev/null || true",
        "sudo ifconfig en0 up 2>/dev/null || true",
        "sudo ifconfig en1 down 2>/dev/null || true",
        "sudo ifconfig en1 up 2>/dev/null || true",
    ];
    for (const cmd of commands) {
        try {
            await execAsync(cmd);
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
        catch (error) {
        }
    }
    console.log("✅ System DNS cache cleared");
}
async function clearAllBrowserCaches() {
    console.log("🚀 Starting comprehensive cache clearing...");
    await clearSystemDNSCache();
    await killAllBrowsers();
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
    await clearSystemDNSCache();
    console.log("✅ All browser caches cleared successfully");
}
async function forceBrowserDNSFlush() {
    console.log("🔄 Forcing browser DNS flush...");
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
            const { stdout } = await execAsync(`pgrep -f "${browser.process}" 2>/dev/null || echo ""`).catch(() => ({ stdout: "" }));
            if (stdout.trim()) {
                console.log(`  Flushing ${browser.name} DNS cache...`);
                if (browser.script) {
                    try {
                        await execAsync(`osascript -e '${browser.script.replace(/'/g, "'\\''")}'`).catch(() => { });
                    }
                    catch { }
                }
            }
        }
        catch (error) {
        }
    }
    try {
        await execAsync(`pkill -USR1 firefox 2>/dev/null || true`);
    }
    catch { }
    try {
        await execAsync(`killall -HUP Safari 2>/dev/null || true`);
    }
    catch { }
    console.log("✅ Browser DNS flush completed");
}
async function restartNetworkServices() {
    console.log("🔄 Restarting network services...");
    try {
        const { stdout } = await execAsync(`networksetup -listallnetworkservices | grep -v "^\\*"`);
        const services = stdout.split("\n").filter((s) => s.trim());
        for (const service of services) {
            if (service.includes("Wi-Fi") || service.includes("Ethernet")) {
                try {
                    await execAsync(`sudo networksetup -setnetworkserviceenabled "${service}" off`);
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    await execAsync(`sudo networksetup -setnetworkserviceenabled "${service}" on`);
                    if (service.includes("Wi-Fi")) {
                        await execAsync(`sudo networksetup -setairportpower en0 off`);
                        await new Promise((resolve) => setTimeout(resolve, 500));
                        await execAsync(`sudo networksetup -setairportpower en0 on`);
                    }
                }
                catch (error) {
                }
            }
        }
    }
    catch (error) {
        console.error("Error restarting network services:", error);
    }
    console.log("✅ Network services restarted");
}
//# sourceMappingURL=browserCacheClearer.js.map