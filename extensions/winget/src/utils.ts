import { exec } from "child_process";
import { promisify } from "util";
import {
  WingetPackage,
  WingetSearchResult,
  WingetListResult,
  CommandResult,
  PowerShellPackage,
  PowerShellApiResult,
} from "./types";

const execAsync = promisify(exec);

export async function executeWingetCommand(command: string): Promise<CommandResult> {
  try {
    // Use PowerShell to execute winget commands for better compatibility
    const fullCommand = `powershell.exe -NoProfile -Command "& { winget ${command} }"`;

    const { stdout, stderr } = await execAsync(fullCommand, {
      encoding: "utf8",
      timeout: 30000,
      windowsHide: true,
    });

    // Consider command successful if we get output, even with warnings in stderr
    const hasOutput = stdout && stdout.trim().length > 0;
    const hasErrors =
      stderr &&
      stderr.trim().length > 0 &&
      !stderr.includes("No available upgrade found") &&
      !stderr.includes("No installed package found") &&
      !stderr.includes("No package found matching input criteria") &&
      !stderr.includes("version numbers that cannot be determined");

    // For upgrade-available commands, be more lenient - consider successful if we have any output
    const isUpgradeCommand = command.includes("--upgrade-available") || command === "upgrade";

    // Debug logging
    console.log("🔍 executeWingetCommand debug:", {
      command,
      hasOutput: hasOutput,
      hasErrors: hasErrors,
      isUpgradeCommand,
      stderrLength: stderr?.length || 0,
      stdoutLength: stdout?.length || 0,
      stderrContent: stderr?.substring(0, 200) || "",
      stdoutPreview: stdout?.substring(0, 100) || "",
    });

    // For upgrade commands, if we have output, consider it successful even with warnings
    const success = isUpgradeCommand ? hasOutput : hasOutput && !hasErrors;

    return {
      success: Boolean(success),
      output: stdout,
      error: stderr,
    };
  } catch {
    // If PowerShell fails, try direct winget execution as fallback
    try {
      const { stdout, stderr } = await execAsync(`winget ${command}`, {
        encoding: "utf8",
        timeout: 30000,
      });

      const hasOutput = stdout && stdout.trim().length > 0;
      const hasErrors =
        stderr &&
        stderr.trim().length > 0 &&
        !stderr.includes("No available upgrade found") &&
        !stderr.includes("No installed package found") &&
        !stderr.includes("No package found matching input criteria") &&
        !stderr.includes("version numbers that cannot be determined");

      const isUpgradeCommand = command.includes("--upgrade-available") || command === "upgrade";

      // Debug logging for fallback
      console.log("🔍 executeWingetCommand fallback debug:", {
        command,
        hasOutput: hasOutput,
        hasErrors: hasErrors,
        isUpgradeCommand,
        stderrLength: stderr?.length || 0,
        stdoutLength: stdout?.length || 0,
        stderrContent: stderr?.substring(0, 200) || "",
        stdoutPreview: stdout?.substring(0, 100) || "",
      });

      // For upgrade commands, if we have output, consider it successful even with warnings
      const success = isUpgradeCommand ? hasOutput : hasOutput && !hasErrors;

      return {
        success: Boolean(success),
        output: stdout,
        error: stderr,
      };
    } catch (fallbackError) {
      return {
        success: false,
        output: "",
        error: fallbackError instanceof Error ? fallbackError.message : "Unknown error occurred",
      };
    }
  }
}

export function parseSearchOutput(output: string): WingetSearchResult {
  const lines = output.split("\n").filter((line) => line.trim());
  const packages: WingetPackage[] = [];
  let startParsing = false;

  for (const line of lines) {
    // Look for the header line
    if (line.includes("Name") && line.includes("Id") && (line.includes("Version") || line.includes("Match"))) {
      startParsing = true;
      continue;
    }

    // Skip separator lines
    if (line.includes("---") || line.includes("===")) {
      continue;
    }

    if (startParsing && line.trim()) {
      // Handle different output formats - sometimes columns are separated by tabs or multiple spaces
      const parts = line.split(/\s{2,}|\t/).filter((part) => part.trim());
      if (parts.length >= 3) {
        packages.push({
          name: parts[0]?.trim() || "",
          id: parts[1]?.trim() || "",
          version: parts[2]?.trim() || "",
          source: parts[3]?.trim() || "winget",
        });
      }
    }
  }

  return {
    packages,
    hasMore: packages.length >= 20,
  };
}

export function parseListOutput(output: string): WingetListResult {
  const lines = output.split("\n").filter((line) => line.trim());
  const packages: WingetPackage[] = [];
  const upgradeable: WingetPackage[] = [];
  let startParsing = false;

  for (const line of lines) {
    // Look for header line - can be "Name Id Version" or "Name Id Version Available Source"
    if (line.includes("Name") && line.includes("Id") && (line.includes("Version") || line.includes("Available"))) {
      startParsing = true;
      continue;
    }

    // Skip separator lines
    if (line.includes("---") || line.includes("===")) {
      continue;
    }

    if (startParsing && line.trim()) {
      const parts = line.split(/\s{2,}|\t/).filter((part) => part.trim());
      if (parts.length >= 3) {
        const pkg: WingetPackage = {
          name: parts[0]?.trim() || "",
          id: parts[1]?.trim() || "",
          version: parts[2]?.trim() || "",
          availableVersion: parts.length > 3 ? parts[3]?.trim() || "" : "",
          source: parts.length > 4 ? parts[4]?.trim() || "winget" : "winget",
        };

        packages.push(pkg);

        // If available version exists and is different, it's upgradeable
        if (
          pkg.availableVersion &&
          pkg.availableVersion !== pkg.version &&
          pkg.availableVersion !== "< " &&
          pkg.availableVersion !== ""
        ) {
          upgradeable.push(pkg);
        }
      }
    }
  }

  return { packages, upgradeable };
}

export async function searchPackages(query: string, exact = false): Promise<WingetSearchResult> {
  // First try exact search if not already specified
  let command = exact ? `search --exact "${query}"` : `search -q "${query}"`;
  let result = await executeWingetCommand(command);

  // If regular search fails or returns no results, try exact search
  if (!result.success || !result.output.includes("Name") || parseSearchOutput(result.output).packages.length === 0) {
    if (!exact) {
      command = `search --exact "${query}"`;
      result = await executeWingetCommand(command);
    }
  }

  if (!result.success) {
    return { packages: [], hasMore: false };
  }

  return parseSearchOutput(result.output);
}

export async function listInstalledPackages(): Promise<WingetListResult> {
  const result = await executeWingetCommand("list -s winget");

  if (!result.success) {
    return { packages: [], upgradeable: [] };
  }

  return parseListOutput(result.output);
}

export function parseUpgradeOutput(output: string): WingetPackage[] {
  console.log("🔍 parseUpgradeOutput called with output length:", output.length);

  const lines = output.split("\n").filter((line) => line.trim());
  console.log("📄 Total non-empty lines:", lines.length);

  const packages: WingetPackage[] = [];
  let headerPositions: { name: number; id: number; version: number; available: number; source?: number } | null = null;
  let startParsing = false;

  // First check if there are actually packages to upgrade
  if (
    output.includes("No available upgrades found") ||
    output.includes("No installed package found matching input criteria")
  ) {
    console.log("⚠️ No upgrades found in output");
    return [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for header line - can be with or without Source column
    if (line.includes("Name") && line.includes("Id") && line.includes("Version") && line.includes("Available")) {
      console.log("📋 Found header line at index", i, ":", line);

      // Calculate column positions from header
      headerPositions = {
        name: line.indexOf("Name"),
        id: line.indexOf("Id"),
        version: line.indexOf("Version"),
        available: line.indexOf("Available"),
        source: line.includes("Source") ? line.indexOf("Source") : undefined,
      };

      console.log("📊 Header positions:", headerPositions);
      startParsing = true;
      continue;
    }

    // Skip separator lines (long dashes)
    if (line.includes("---") || line.includes("===") || line.match(/^-+$/)) {
      console.log("➖ Skipping separator line:", line.substring(0, 50));
      continue;
    }

    // Skip summary lines
    if (line.includes("upgrades available") || line.includes("package(s) have version numbers")) {
      console.log("📊 Skipping summary line:", line);
      continue;
    }

    if (startParsing && line.trim() && headerPositions) {
      console.log("🔧 Parsing line", i, ":", line);

      // Smart parsing: Find the ID by pattern (no spaces, contains dots)
      // Typical winget ID pattern: Publisher.ProductName (e.g., JetBrains.IntelliJIDEA.Community)
      const words = line.split(/\s+/);
      let idIndex = -1;
      let id = "";

      // Look for a word that looks like an ID (contains dots, no spaces within)
      for (let j = 0; j < words.length; j++) {
        if (words[j].includes(".") && !words[j].includes(" ") && words[j].length > 5) {
          idIndex = j;
          id = words[j];
          break;
        }
      }

      if (idIndex > 0 && id) {
        // Now we can properly split the line
        const beforeId = words.slice(0, idIndex).join(" "); // Name
        const afterId = words.slice(idIndex + 1); // Version, Available, Source

        const name = beforeId.trim();

        // Handle version parsing better - join parts that belong together
        // For cases like "< 168.1.0.12922", we want to keep the < with the version
        let version = "";
        let availableVersion = "";
        let source = "winget";

        if (afterId.length >= 2) {
          // Check if first part is a special character like "<"
          if (afterId[0] === "<" || afterId[0] === ">") {
            version = `${afterId[0]} ${afterId[1]}`; // "< 168.1.0.12922"
            availableVersion = afterId[2] || "";
            source = afterId[3] || "winget";
          } else {
            version = afterId[0] || "";
            availableVersion = afterId[1] || "";
            source = afterId[2] || "winget";
          }
        } else {
          version = afterId[0] || "";
        }

        console.log("🔍 Smart parsing result:", {
          name,
          id,
          version,
          available: availableVersion,
          source,
          afterIdParts: afterId,
        });

        if (name && id) {
          const pkg: WingetPackage = {
            name: name,
            id: id,
            version: version,
            availableVersion: availableVersion,
            source: source,
          };

          packages.push(pkg);
          console.log("✅ Smart parsing successful:", pkg.name, "->", pkg.id);
          continue;
        }
      }

      // Fallback: try the old space-splitting method
      const parts = line
        .split(/\s{2,}/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      console.log("� Fallback space-split parsing found", parts.length, "parts:", parts);

      if (parts.length >= 4 && parts[0] !== "Name") {
        const pkg: WingetPackage = {
          name: parts[0],
          id: parts[1],
          version: parts[2].replace(/^< /, ""),
          availableVersion: parts[3],
          source: parts[4] || "winget",
        };

        packages.push(pkg);
        console.log("✅ Fallback parsing successful:", pkg.name);
      } else {
        console.log("❌ All parsing methods failed for line:", line);
      }
    }
  }

  console.log("🎯 parseUpgradeOutput returning", packages.length, "packages");
  return packages;
}

// Cache for upgradeable packages to prevent empty results from overriding good data
let upgradeablePackagesCache: { packages: WingetPackage[]; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 seconds
let isExecuting = false; // Prevent simultaneous calls

export async function getUpgradeablePackages(): Promise<WingetPackage[]> {
  console.log("🔍 Starting getUpgradeablePackages()");

  // Prevent simultaneous execution
  if (isExecuting) {
    console.log("⏳ Already executing, waiting for cache...");
    // Wait a bit and check cache
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (upgradeablePackagesCache && Date.now() - upgradeablePackagesCache.timestamp < CACHE_DURATION) {
      return upgradeablePackagesCache.packages;
    }
  }

  isExecuting = true;

  try {
    // Check cache first
    if (upgradeablePackagesCache && Date.now() - upgradeablePackagesCache.timestamp < CACHE_DURATION) {
      console.log("📋 Using cached result with", upgradeablePackagesCache.packages.length, "packages");
      return upgradeablePackagesCache.packages;
    }

    // Try multiple command variations
    const commands = [
      "upgrade",
      // "list --upgrade-available",                  // first one works
      // "upgrade --include-unknown",                 // first one works
      // "list --upgrade-available --include-unknown" // first one works
    ];

    let result: CommandResult | null = null;

    for (const cmd of commands) {
      console.log(`🔄 Trying command: winget ${cmd}`);
      result = await executeWingetCommand(cmd);

      console.log("📋 Command result:", {
        command: cmd,
        success: result.success,
        outputLength: result.output?.length || 0,
        errorLength: result.error?.length || 0,
      });

      if (result.success && result.output?.length > 0) {
        console.log("✅ Command succeeded, using this result");
        break;
      } else {
        console.log("❌ Command failed:", result.error);
      }
    }

    if (!result || !result.success || result.output.length === 0) {
      console.log("⚠️ All commands failed, returning empty array");
      return [];
    }

    if (result.output.length > 0) {
      console.log("📝 Raw output preview:");
      const lines = result.output.split("\n");
      lines.slice(0, 10).forEach((line, i) => {
        console.log(`Line ${i}: "${line}"`);
      });
    }

    // Since both commands only return upgradeable packages, just parse them directly
    let packages = parseUpgradeOutput(result.output);
    console.log("🔧 Specialized parsing found:", packages.length, "packages");

    // If specialized parsing fails, try regular parsing as fallback
    if (packages.length === 0) {
      console.log("🔄 Trying fallback parsing...");
      const parseResult = parseListOutput(result.output);
      console.log("📦 Regular parsing found:", parseResult.packages.length, "total packages");
      // Since the command only returns upgradeable packages, use all of them
      packages = parseResult.packages;
    }

    console.log(
      "🎯 Final result:",
      packages.map((p) => ({ name: p.name, id: p.id, version: p.version, available: p.availableVersion })),
    );

    // Cache successful results
    if (packages.length > 0) {
      upgradeablePackagesCache = {
        packages: packages,
        timestamp: Date.now(),
      };
      console.log("💾 Cached", packages.length, "packages");
    } else if (upgradeablePackagesCache && Date.now() - upgradeablePackagesCache.timestamp < CACHE_DURATION) {
      console.log("⚠️ Current call returned no packages, but using cached data instead");
      return upgradeablePackagesCache.packages;
    }

    return packages;
  } finally {
    isExecuting = false;
  }
}

export async function installPackage(packageId: string): Promise<CommandResult> {
  return executeWingetCommand(`install "${packageId}" --accept-package-agreements --accept-source-agreements`);
}

export async function upgradePackage(packageId: string): Promise<CommandResult> {
  return executeWingetCommand(`upgrade "${packageId}" --accept-package-agreements --accept-source-agreements`);
}

export async function uninstallPackage(packageId: string): Promise<CommandResult> {
  return executeWingetCommand(`uninstall "${packageId}"`);
}

export async function upgradeAll(): Promise<CommandResult> {
  return executeWingetCommand("upgrade --all --accept-package-agreements --accept-source-agreements");
}

// ==================== PowerShell API Functions ====================

/**
 * Check if Microsoft.WinGet.Client PowerShell module is available
 */
export async function checkPowerShellModule(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      'powershell.exe -NoProfile -Command "Get-Module -ListAvailable Microsoft.WinGet.Client | Select-Object -First 1"',
      { encoding: "utf8", timeout: 5000, windowsHide: true },
    );
    return stdout.trim().length > 0;
  } catch (error) {
    console.log("PowerShell module check failed:", error);
    return false;
  }
}

/**
 * Execute PowerShell command with WinGet module
 */
async function executePowerShellWinget(command: string): Promise<PowerShellApiResult> {
  try {
    // Use a more robust approach with proper quote escaping
    const escapedCommand = command.replace(/"/g, '\\"');
    const fullCommand = `powershell.exe -NoProfile -Command "& {Import-Module Microsoft.WinGet.Client -Force; ${escapedCommand} | ConvertTo-Json -Depth 5 -Compress}"`;

    console.log("🔧 PowerShell command:", fullCommand);

    const { stdout, stderr } = await execAsync(fullCommand, {
      encoding: "utf8",
      timeout: 60000, // PowerShell API can be slower
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large results
    });

    if (stderr && !stderr.includes("WARNING")) {
      // Check for CLIXML errors which indicate PowerShell formatting issues
      if (stderr.includes("CLIXML") || stderr.includes("Preparing modules")) {
        console.log("🔧 PowerShell CLIXML error detected, this is usually a formatting issue");
        return { success: false, packages: [], error: "PowerShell module loading issue" };
      }
      return { success: false, packages: [], error: stderr };
    }

    // Also check stdout for CLIXML errors
    if (stdout.includes("CLIXML")) {
      console.log("🔧 CLIXML detected in stdout, treating as error");
      return { success: false, packages: [], error: "PowerShell formatting error in output" };
    }

    // Parse JSON output
    try {
      if (!stdout || stdout.trim().length === 0) {
        return { success: false, packages: [], error: "No output from PowerShell command" };
      }

      const rawData = JSON.parse(stdout);
      const packages: PowerShellPackage[] = Array.isArray(rawData) ? rawData : [rawData];
      return { success: true, packages: packages.filter((p) => p && p.Id) };
    } catch (parseError) {
      console.error("Failed to parse PowerShell JSON output:", parseError);
      console.error("Raw output:", stdout.substring(0, 500));
      return { success: false, packages: [], error: "Failed to parse JSON response" };
    }
  } catch (error) {
    return {
      success: false,
      packages: [],
      error: error instanceof Error ? error.message : "Unknown PowerShell error",
    };
  }
}

/**
 * Convert PowerShell package to WingetPackage format
 */
function convertPowerShellPackage(psPackage: PowerShellPackage): WingetPackage {
  return {
    id: psPackage.Id,
    name: psPackage.Name,
    version: psPackage.InstalledVersion || psPackage.Version,
    installedVersion: psPackage.InstalledVersion,
    availableVersion: psPackage.AvailableVersions?.[0],
    isUpdateAvailable: psPackage.IsUpdateAvailable,
    availableVersions: psPackage.AvailableVersions,
    source: psPackage.Source || "winget",
  };
}

/**
 * Get installed packages using PowerShell API
 */
export async function getInstalledPackagesPowerShell(): Promise<WingetPackage[]> {
  const result = await executePowerShellWinget("Get-WinGetPackage");

  if (!result.success) {
    console.error("PowerShell API failed:", result.error);
    return [];
  }

  return result.packages.map(convertPowerShellPackage);
}

/**
 * Get upgradeable packages using PowerShell API
 */
export async function getUpgradeablePackagesPowerShell(): Promise<WingetPackage[]> {
  const result = await executePowerShellWinget("Get-WinGetPackage | Where-Object { $_.IsUpdateAvailable -eq $true }");

  if (!result.success) {
    console.error("PowerShell API failed:", result.error);
    return [];
  }

  return result.packages.map(convertPowerShellPackage);
}

/**
 * Search for packages using PowerShell API
 */
export async function searchPackagesPowerShell(query: string): Promise<WingetPackage[]> {
  // Use single quotes to avoid issues with spaces and escape single quotes within the query
  const escapedQuery = query.replace(/'/g, "''");
  const result = await executePowerShellWinget(`Find-WinGetPackage -Query '${escapedQuery}'`);

  if (!result.success) {
    console.error("PowerShell search failed:", result.error);
    return [];
  }

  return result.packages.map(convertPowerShellPackage);
}

/**
 * Enhanced upgrade function with PowerShell API fallback
 */
export async function getUpgradeablePackagesEnhanced(): Promise<WingetPackage[]> {
  console.log("🔍 Starting enhanced upgradeable packages check");

  // First, try PowerShell API
  const hasPowerShellModule = await checkPowerShellModule();

  if (hasPowerShellModule) {
    console.log("✅ PowerShell module available, trying PowerShell API");
    try {
      const packages = await getUpgradeablePackagesPowerShell();
      if (packages.length > 0) {
        console.log(`🎯 PowerShell API returned ${packages.length} upgradeable packages`);
        return packages;
      }
      console.log("⚠️ PowerShell API returned no packages, falling back to CLI");
    } catch (error) {
      console.log("❌ PowerShell API failed, falling back to CLI:", error);
    }
  } else {
    console.log("⚠️ PowerShell module not available, using CLI method");
  }

  // Fallback to original CLI method
  return getUpgradeablePackages();
}

/**
 * Enhanced list function with PowerShell API fallback
 */
export async function listInstalledPackagesEnhanced(): Promise<WingetListResult> {
  console.log("🔍 Starting enhanced installed packages check");

  // First, try PowerShell API
  const hasPowerShellModule = await checkPowerShellModule();

  if (hasPowerShellModule) {
    console.log("✅ PowerShell module available, trying PowerShell API");
    try {
      const allPackages = await getInstalledPackagesPowerShell();
      const upgradeable = allPackages.filter((pkg) => pkg.isUpdateAvailable === true);

      console.log(`🎯 PowerShell API returned ${allPackages.length} total packages, ${upgradeable.length} upgradeable`);
      return { packages: allPackages, upgradeable };
    } catch (error) {
      console.log("❌ PowerShell API failed, falling back to CLI:", error);
    }
  } else {
    console.log("⚠️ PowerShell module not available, using CLI method");
  }

  // Fallback to original CLI method
  return listInstalledPackages();
}

/**
 * Enhanced search function with PowerShell API fallback
 */
export async function searchPackagesEnhanced(query: string, exact = false): Promise<WingetSearchResult> {
  console.log(`🔍 Starting enhanced search for: "${query}"`);

  // First, try PowerShell API
  const hasPowerShellModule = await checkPowerShellModule();

  if (hasPowerShellModule) {
    console.log("✅ PowerShell module available, trying PowerShell API");
    try {
      const packages = await searchPackagesPowerShell(query);
      if (packages.length > 0) {
        console.log(`🎯 PowerShell API returned ${packages.length} search results`);
        return { packages, hasMore: packages.length >= 20 };
      }
      console.log("⚠️ PowerShell API returned no results, falling back to CLI");
    } catch (error) {
      console.log("❌ PowerShell search failed, falling back to CLI:", error);
    }
  } else {
    console.log("⚠️ PowerShell module not available, using CLI method");
  }

  // Fallback to original CLI method
  console.log("🔄 Using CLI search method");
  return searchPackages(query, exact);
}
