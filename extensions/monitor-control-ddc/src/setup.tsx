import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed" | "failed" | "checking";
  action?: () => Promise<void>;
  command?: string;
}

export default function Setup() {
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: "homebrew",
      title: "Install Homebrew",
      description: "Package manager required for installing m1ddc",
      status: "checking",
    },
    {
      id: "m1ddc",
      title: "Install m1ddc",
      description: "DDC/CI tool for controlling external monitors on Apple Silicon",
      status: "pending",
    },
    {
      id: "connection",
      title: "Check Monitor Connection",
      description: "Verify your BenQ monitor is connected via USB-C/Thunderbolt",
      status: "pending",
    },
    {
      id: "test",
      title: "Test Monitor Control",
      description: "Verify m1ddc can communicate with your monitor",
      status: "pending",
    },
  ]);

  const updateStepStatus = (id: string, status: SetupStep["status"]) => {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, status } : step)));
  };

  const checkHomebrew = async () => {
    try {
      // Try multiple ways to detect Homebrew
      const possiblePaths = [
        "/opt/homebrew/bin/brew", // Apple Silicon
        "/usr/local/bin/brew", // Intel
        "brew", // PATH
      ];

      let found = false;
      for (const path of possiblePaths) {
        try {
          execSync(`${path} --version`, { stdio: "ignore" });
          found = true;
          break;
        } catch {
          continue;
        }
      }

      if (found) {
        updateStepStatus("homebrew", "completed");
        checkM1DDC();
      } else {
        updateStepStatus("homebrew", "failed");
      }
    } catch {
      updateStepStatus("homebrew", "failed");
    }
  };

  const checkM1DDC = async () => {
    updateStepStatus("m1ddc", "checking");
    try {
      const possiblePaths = [
        "/opt/homebrew/bin/m1ddc", // Apple Silicon Homebrew
        "/usr/local/bin/m1ddc", // Intel Homebrew
        "m1ddc", // PATH
      ];

      let found = false;
      // let workingPath = "";

      for (const path of possiblePaths) {
        try {
          execSync(`"${path}" --help`, { stdio: "ignore", timeout: 5000 });
          found = true;
          // workingPath = path;
          break;
        } catch {
          continue;
        }
      }

      if (found) {
        updateStepStatus("m1ddc", "completed");
        checkConnection();
      } else {
        updateStepStatus("m1ddc", "failed");
      }
    } catch {
      updateStepStatus("m1ddc", "failed");
    }
  };

  const findM1DDC = () => {
    const possiblePaths = ["/opt/homebrew/bin/m1ddc", "/usr/local/bin/m1ddc", "m1ddc"];

    for (const path of possiblePaths) {
      try {
        execSync(`"${path}" --help`, { stdio: "ignore", timeout: 2000 });
        return path;
      } catch {
        continue;
      }
    }
    return null;
  };

  const checkConnection = async () => {
    updateStepStatus("connection", "checking");
    try {
      const m1ddcPath = findM1DDC();
      if (!m1ddcPath) {
        updateStepStatus("connection", "failed");
        return;
      }

      const output = execSync(`"${m1ddcPath}" display list`, {
        encoding: "utf-8",
        timeout: 10000,
      });

      if (output.includes("Display") || output.trim().length > 0) {
        updateStepStatus("connection", "completed");
        testMonitorControl();
      } else {
        updateStepStatus("connection", "failed");
      }
    } catch {
      updateStepStatus("connection", "failed");
    }
  };

  const testMonitorControl = async () => {
    updateStepStatus("test", "checking");
    try {
      const m1ddcPath = findM1DDC();
      if (!m1ddcPath) {
        updateStepStatus("test", "failed");
        return;
      }

      execSync(`"${m1ddcPath}" get luminance`, {
        stdio: "ignore",
        timeout: 10000,
      });

      updateStepStatus("test", "completed");
      await showToast({
        style: Toast.Style.Success,
        title: "Setup Complete!",
        message: "Monitor control is ready to use",
      });
    } catch {
      updateStepStatus("test", "failed");
    }
  };

  const installHomebrew = async () => {
    await Clipboard.copy(
      '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Command Copied",
      message: "Paste in Terminal to install Homebrew",
    });
  };

  const installM1DDC = async () => {
    const command =
      process.arch === "arm64" ? "/opt/homebrew/bin/brew install m1ddc" : "/usr/local/bin/brew install m1ddc";

    await Clipboard.copy(command);
    await showToast({
      style: Toast.Style.Success,
      title: "Command Copied",
      message: "Paste in Terminal to install m1ddc",
    });
  };

  useEffect(() => {
    checkHomebrew();
  }, []);

  const getStatusIcon = (status: SetupStep["status"]) => {
    switch (status) {
      case "completed":
        return Icon.CheckCircle;
      case "failed":
        return Icon.XMarkCircle;
      case "checking":
        return Icon.Clock;
      default:
        return Icon.Circle;
    }
  };

  const getStatusColor = (status: SetupStep["status"]) => {
    switch (status) {
      case "completed":
        return "#00FF88";
      case "failed":
        return "#FF6B6B";
      case "checking":
        return "#FFD700";
      default:
        return "#888888";
    }
  };

  return (
    <List>
      <List.Section title="Monitor Control Setup">
        {steps.map((step) => (
          <List.Item
            key={step.id}
            title={step.title}
            subtitle={step.description}
            icon={{ source: getStatusIcon(step.status), tintColor: getStatusColor(step.status) }}
            accessories={[{ text: step.status === "checking" ? "Checking..." : step.status }]}
            actions={
              <ActionPanel>
                {step.id === "homebrew" && step.status === "failed" && (
                  <Action title="Install Homebrew" icon={Icon.Download} onAction={installHomebrew} />
                )}
                {step.id === "m1ddc" && step.status === "failed" && (
                  <Action title="Install M1ddc" icon={Icon.Download} onAction={installM1DDC} />
                )}
                {step.status === "completed" && (
                  <Action
                    title="Recheck"
                    icon={Icon.Repeat}
                    onAction={() => {
                      if (step.id === "homebrew") checkHomebrew();
                      if (step.id === "m1ddc") checkM1DDC();
                      if (step.id === "connection") checkConnection();
                      if (step.id === "test") testMonitorControl();
                    }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Troubleshooting">
        <List.Item
          title="Connection Issues"
          subtitle="Monitor not detected via USB-C/Thunderbolt"
          icon="⚠️"
          actions={
            <ActionPanel>
              <Action
                title="Copy Troubleshooting Guide"
                onAction={async () => {
                  await Clipboard.copy(`Monitor Connection Troubleshooting:

1. Ensure monitor is connected via USB-C or Thunderbolt (NOT HDMI)
2. Built-in HDMI ports on M1/M2 Macs are not supported
3. Try a different USB-C/Thunderbolt cable
4. Check if DDC/CI is enabled in your monitor's OSD menu
5. Some monitors require specific input modes for DDC/CI

For BenQ monitors:
- Enable DDC/CI in System > DDC/CI menu
- Try different input sources
- Restart monitor after changing settings`);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Troubleshooting Guide Copied",
                  });
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Intel Mac Users"
          subtitle="Use ddcctl instead of m1ddc"
          icon="💻"
          actions={
            <ActionPanel>
              <Action
                title="Copy Intel Mac Command"
                onAction={async () => {
                  await Clipboard.copy("brew install ddcctl");
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Command Copied",
                    message: "Install ddcctl for Intel Macs",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Quick Actions">
        <List.Item
          title="Refresh All Checks"
          subtitle="Re-run all setup checks"
          icon={Icon.Repeat}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Setup"
                onAction={() => {
                  setSteps((prev) => prev.map((step) => ({ ...step, status: "checking" })));
                  checkHomebrew();
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
