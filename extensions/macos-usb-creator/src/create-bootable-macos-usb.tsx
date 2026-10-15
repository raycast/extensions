import { List, Detail, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { existsSync, readFileSync, unlinkSync, readdirSync, writeFileSync, chmodSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

interface MacOSInstaller {
  name: string;
  version: string;
  build?: string;
  size?: string;
  date?: string;
  isLocal?: boolean;
  path?: string;
}

interface USBVolume {
  name: string;
  path: string;
}

function getMistPath(): string | null {
  const possiblePaths = ["/opt/homebrew/bin/mist", "/usr/local/bin/mist", "/usr/bin/mist"];

  for (const path of possiblePaths) {
    if (existsSync(path)) return path;
  }
  return null;
}

function getLocalInstallers(): MacOSInstaller[] {
  try {
    const apps = readdirSync("/Applications");
    return apps
      .filter((file) => file.startsWith("Install macOS") && file.endsWith(".app"))
      .map((file) => ({
        name: file.replace(".app", ""),
        version: file.replace("Install macOS ", "").replace(".app", ""),
        isLocal: true,
        path: `/Applications/${file}`,
      }));
  } catch {
    return [];
  }
}

function renderProgressBar(percent: number): string {
  const totalBlocks = 20;
  const filledBlocks = Math.round((percent / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  const bar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
  return `\`[${bar}]\` **${percent}%**`;
}

function execSudoWithProgress(command: string, onProgress: (text: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const escapedCmd = command.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const appleScript = `do shell script "${escapedCmd}" with administrator privileges`;

    const child = spawn("osascript", ["-e", appleScript]);

    child.stdout.on("data", (data) => {
      const line = data.toString().trim();
      if (line) onProgress(line);
    });

    child.stderr.on("data", (data) => {
      const line = data.toString().trim();
      if (line) onProgress(line);
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });

    child.on("error", (err) => reject(err));
  });
}

export default function Command() {
  const [onlineInstallers, setOnlineInstallers] = useState<MacOSInstaller[]>([]);
  const [localInstallers, setLocalInstallers] = useState<MacOSInstaller[]>([]);
  const [volumes, setVolumes] = useState<USBVolume[]>([]);
  const [selectedInstaller, setSelectedInstaller] = useState<MacOSInstaller | null>(null);
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [step, setStep] = useState<"installer" | "usb" | "progress">("installer");

  // Progress Tracking State
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<string>("Initializing...");
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    async function fetchInstallers() {
      const locals = getLocalInstallers();
      setLocalInstallers(locals);

      const tempJsonPath = join(tmpdir(), `mist-installers-${Date.now()}.json`);

      try {
        const mistBin = getMistPath();

        if (!mistBin) {
          if (locals.length === 0) {
            await showToast({
              style: Toast.Style.Failure,
              title: "mist-cli not found",
              message: "Install via 'brew install mist-cli' in Terminal",
            });
          }
          setLoading(false);
          return;
        }

        await execAsync(`"${mistBin}" list installer --export "${tempJsonPath}" --quiet`);

        if (existsSync(tempJsonPath)) {
          const rawData = readFileSync(tempJsonPath, "utf-8");
          const parsed = JSON.parse(rawData);

          const formatted: MacOSInstaller[] = parsed.map((item) => ({
            name: item.name,
            version: item.version,
            build: item.build,
            size: item.size,
            date: item.date,
            isLocal: false,
          }));

          setOnlineInstallers(formatted);
        }
      } catch (error) {
        const err = error as Error;
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch online installers",
          message: err.message,
        });
      } finally {
        if (existsSync(tempJsonPath)) {
          try {
            unlinkSync(tempJsonPath);
          } catch {
            error;
          }
        }
        setLoading(false);
      }
    }

    fetchInstallers();
  }, []);

  const fetchVolumes = async () => {
    setLoading(true);
    try {
      const { stdout } = await execAsync("ls /Volumes");
      const driveList = stdout
        .split("\n")
        .filter((v) => v.trim() !== "" && v !== "Macintosh HD")
        .map((v) => ({ name: v, path: `/Volumes/${v}` }));

      setVolumes(driveList);
      setStep("usb");
    } catch (error) {
      const err = error as Error;
      showToast({
        style: Toast.Style.Failure,
        title: "Error listing USB drives",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Launch interactive Terminal execution fallback
  const handleLaunchTerminalFallback = async () => {
    if (!selectedInstaller || !selectedVolume) return;

    const scriptPath = join(tmpdir(), `create-usb-${Date.now()}.sh`);
    const appPath = selectedInstaller.path || `/Applications/${selectedInstaller.name}.app`;

    const scriptContent = `#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
clear
echo "==============================================="
echo " Creating macOS Bootable USB (Terminal Mode)"
echo "==============================================="
echo ""
echo "Target Volume: /Volumes/${selectedVolume}"
echo "Installer: ${appPath}"
echo ""
echo "Running createinstallmedia with sudo..."
sudo "${appPath}/Contents/Resources/createinstallmedia" --volume "/Volumes/${selectedVolume}"

echo ""
echo "==============================================="
echo " Complete! Press Enter to close."
echo "==============================================="
read -p ""
rm -f "${scriptPath}"
`;

    try {
      writeFileSync(scriptPath, scriptContent, "utf-8");
      chmodSync(scriptPath, "755");

      const appleScript = `
        tell application "Terminal"
          activate
          do script "${scriptPath}"
        end tell
      `;

      await execAsync(`osascript -e '${appleScript}'`);
      await showToast({
        style: Toast.Style.Success,
        title: "Terminal Opened",
        message: "Authenticate in Terminal to bypass disk permission checks.",
      });
    } catch (error) {
      const err = error as Error;
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open Terminal",
        message: err.message,
      });
    }
  };

  const handleStartProcess = async (volumeName: string) => {
    if (!selectedInstaller) return;

    const confirmed = await confirmAlert({
      title: "Erase USB Drive?",
      message: `This will completely ERASE the volume "/Volumes/${volumeName}". Are you sure you want to proceed?`,
      primaryAction: {
        title: "Erase & Create",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    setSelectedVolume(volumeName);
    setStep("progress");

    const appendLog = (msg: string) => {
      setStatusLogs((prev) => [...prev.slice(-10), msg]);
    };

    try {
      const mistBin = getMistPath();

      // Stage 1: Download installer if needed
      if (!selectedInstaller.isLocal) {
        if (!mistBin) throw new Error("mist-cli executable not found.");

        setCurrentStage(`Downloading macOS ${selectedInstaller.version} via mist...`);
        appendLog("Requesting admin privileges for download...");

        await execSudoWithProgress(
          `"${mistBin}" download installer "${selectedInstaller.version}" application`,
          (output) => {
            appendLog(output);
            const match = output.match(/(\d+)%/);
            if (match) {
              const pct = parseInt(match[1], 10);
              setProgressPercent(Math.round(pct / 2));
            }
          },
        );
      } else {
        setProgressPercent(20);
        appendLog(`Using local installer: ${selectedInstaller.path}`);
      }

      // Stage 2: Locate App Bundle
      setCurrentStage("Locating installer application bundle...");
      let appPath = selectedInstaller.path;

      if (!appPath) {
        const apps = readdirSync("/Applications");
        const installerApp = apps.find((f) => f.startsWith("Install macOS") && f.endsWith(".app"));
        if (installerApp) appPath = `/Applications/${installerApp}`;
      }

      if (!appPath || !existsSync(appPath)) {
        throw new Error("Could not find installer application in /Applications.");
      }

      // Stage 3: Erase & Write to USB Volume
      setCurrentStage(`Writing installer to /Volumes/${volumeName}...`);
      setProgressPercent(30);

      const createMediaCmd = `"${appPath}/Contents/Resources/createinstallmedia" --volume "/Volumes/${volumeName}" --nointeraction`;

      await execSudoWithProgress(createMediaCmd, (output) => {
        appendLog(output);

        const match = output.match(/(\d+)%/);
        if (match) {
          const pct = parseInt(match[1], 10);
          const scaled = Math.round(30 + pct * 0.7);
          setProgressPercent(scaled);
        } else if (output.includes("Making disk bootable")) {
          setProgressPercent(95);
        }
      });

      // Complete State
      setProgressPercent(100);
      setCurrentStage("Bootable USB creation completed successfully!");
      setIsCompleted(true);
      appendLog("Done! You can safely eject your drive.");
    } catch (error) {
      const err = error as Error;
      setHasError(true);
      setCurrentStage("Operation Failed: Permission Denied");
      appendLog(`Error: ${err.message || "An unknown error occurred."}`);
    }
  };

  // View 1: Installer Picker
  if (step === "installer") {
    return (
      <List isLoading={loading} searchBarPlaceholder="Search macOS installers...">
        {localInstallers.length > 0 && (
          <List.Section title="Downloaded Installers (In /Applications)">
            {localInstallers.map((item) => (
              <List.Item
                key={item.path}
                icon={Icon.HardDrive}
                title={item.name}
                subtitle="Ready on Disk"
                accessories={[{ text: "Local App" }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Use Local Installer"
                      icon={Icon.ArrowRight}
                      onAction={() => {
                        setSelectedInstaller(item);
                        fetchVolumes();
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        <List.Section title="Available for Download (Apple Catalogs)">
          {onlineInstallers.map((item) => (
            <List.Item
              key={`${item.version}-${item.build}`}
              icon={Icon.Download}
              title={item.name}
              subtitle={`v${item.version} (${item.build})`}
              accessories={[...(item.size ? [{ text: item.size }] : []), ...(item.date ? [{ text: item.date }] : [])]}
              actions={
                <ActionPanel>
                  <Action
                    title="Download & Create Usb"
                    icon={Icon.ArrowRight}
                    onAction={() => {
                      setSelectedInstaller(item);
                      fetchVolumes();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  // View 2: USB Target Selection
  if (step === "usb") {
    return (
      <List isLoading={loading} searchBarPlaceholder="Select target USB volume to format...">
        <List.Section title={`Target USB Drive for ${selectedInstaller?.name}`}>
          {volumes.length === 0 ? (
            <List.Item
              icon={Icon.ExclamationMark}
              title="No External USB Drives Found"
              subtitle="Plug in a drive (≥16GB) formatted as Mac OS Extended / APFS, then press ⌘+R."
              actions={
                <ActionPanel>
                  <Action title="Refresh Drives" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={fetchVolumes} />
                  <Action
                    title="Back to Installers"
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    onAction={() => setStep("installer")}
                  />
                </ActionPanel>
              }
            />
          ) : (
            volumes.map((vol) => (
              <List.Item
                key={vol.path}
                icon={Icon.HardDrive}
                title={vol.name}
                subtitle={vol.path}
                actions={
                  <ActionPanel>
                    <Action
                      title="Create Bootable Usb"
                      icon={Icon.Checkmark}
                      onAction={() => handleStartProcess(vol.name)}
                    />
                    <Action
                      title="Back to Installers"
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                      onAction={() => setStep("installer")}
                    />
                    <Action
                      title="Refresh Drives"
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={fetchVolumes}
                    />
                  </ActionPanel>
                }
              />
            ))
          )}
        </List.Section>
      </List>
    );
  }

  // View 3: Live Progress Detail View
  const markdown = `
# macOS Bootable USB Creator

**Target Drive:** \`/Volumes/${selectedVolume}\`  
**Installer:** ${selectedInstaller?.name}

---

### Status
${currentStage}

${renderProgressBar(progressPercent)}

${
  hasError
    ? `> **Permission Fix:** Grant **Full Disk Access** to **Raycast** in *System Settings → Privacy & Security*, or use the **"Run in Terminal"** action below.`
    : ""
}

---

### Live Log Output
\`\`\`text
${statusLogs.length > 0 ? statusLogs.join("\n") : "Waiting for output..."}
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={isCompleted ? "Completed" : hasError ? "Failed" : "In Progress"}
            icon={isCompleted ? Icon.Checkmark : hasError ? Icon.XMarkCircle : Icon.Clock}
          />
          <Detail.Metadata.Label title="Progress" text={`${progressPercent}%`} />
          <Detail.Metadata.Label title="Drive" text={`/Volumes/${selectedVolume}`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {hasError && (
            <Action
              title="Run in Terminal (bypass Permission Error)"
              icon={Icon.Terminal}
              onAction={handleLaunchTerminalFallback}
            />
          )}
          {(isCompleted || hasError) && (
            <Action
              title="Return to Main Menu"
              icon={Icon.ArrowLeft}
              onAction={() => {
                setStep("installer");
                setIsCompleted(false);
                setHasError(false);
                setProgressPercent(0);
                setStatusLogs([]);
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
