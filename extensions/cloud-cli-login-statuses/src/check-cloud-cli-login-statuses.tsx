import { ActionPanel, Action, Icon, List, showToast, Toast, Color, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { execa } from "execa";
import path from "path";
import os from "os";

interface CloudStatus {
  id: string;
  name: string;
  icon: { source: string };
  isLoggedIn: boolean;
  isLoading: boolean;
  error?: string;
  account?: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [statuses, setStatuses] = useState<CloudStatus[]>([
    {
      id: "aws",
      name: "AWS",
      icon: {
        source: environment.appearance === "dark" ? "Amazon Web Services-dark.svg" : "Amazon Web Services-light.svg",
      },
      isLoggedIn: false,
      isLoading: true,
    },
    {
      id: "gcloud",
      name: "Google Cloud",
      icon: { source: "Google.svg" },
      isLoggedIn: false,
      isLoading: true,
    },
    {
      id: "azure",
      name: "Azure",
      icon: { source: "Microsoft Azure.svg" },
      isLoggedIn: false,
      isLoading: true,
    },
  ]);

  // Update AWS icon when appearance changes
  useEffect(() => {
    setStatuses((prevStatuses) =>
      prevStatuses.map((status) =>
        status.id === "aws"
          ? {
              ...status,
              icon: {
                source:
                  environment.appearance === "dark" ? "Amazon Web Services-dark.svg" : "Amazon Web Services-light.svg",
              },
            }
          : status,
      ),
    );
  }, [environment.appearance]);

  useEffect(() => {
    checkCloudStatuses();
  }, []);

  const checkCloudStatuses = async () => {
    try {
      // Set global loading state
      setIsLoading(true);

      // Reset loading state
      setStatuses((prevStatuses) => prevStatuses.map((status) => ({ ...status, isLoading: true })));

      // Run all checks concurrently
      await Promise.all([checkAwsStatus(), checkGcloudStatus(), checkAzureStatus()]);

      // Clear global loading state
      setIsLoading(false);
    } catch (error) {
      console.error("Error checking cloud statuses:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to check cloud statuses",
        message: String(error),
      });
      setIsLoading(false);
    }
  };

  const getEnhancedPath = () => {
    const additionalPaths = [
      "/usr/local/bin",
      "/opt/homebrew/bin",
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin",
      path.join(os.homedir(), "bin"),
      path.join(os.homedir(), ".local/bin"),
    ];

    const currentPath = process.env.PATH || "";
    return [...additionalPaths, ...currentPath.split(":")].join(":");
  };

  const runCommand = async (
    cmd: string,
    args: string[],
  ): Promise<{ success: boolean; message: string; stdout: string }> => {
    try {
      const cmdPath = await execa("which", [cmd], {
        env: { PATH: getEnhancedPath() },
      })
        .then((r) => r.stdout.trim())
        .catch(() => cmd);

      console.log(`Running ${cmdPath} with args: ${args.join(" ")}`);

      const result = await execa(cmdPath, args, {
        env: { PATH: getEnhancedPath() },
        reject: false,
      });

      console.log(`Command result: ${result.exitCode}`);
      if (result.exitCode === 0) {
        return { success: true, message: "", stdout: result.stdout };
      } else {
        return { success: false, message: result.stderr || "Command failed", stdout: result.stdout };
      }
    } catch (error) {
      console.error("Command execution error:", error);
      return { success: false, message: String(error), stdout: "" };
    }
  };

  const checkAwsStatus = async () => {
    try {
      const result = await runCommand("aws", ["sts", "get-caller-identity"]);
      let account = "";

      if (result.success && result.stdout) {
        try {
          const data = JSON.parse(result.stdout);
          account = data.Arn || data.Account || "";
        } catch {
          account = result.stdout.split("\n")[0];
        }
      }

      updateStatus("aws", result.success, result.message, account);
    } catch (error) {
      updateStatus("aws", false, String(error));
    }
  };

  const checkGcloudStatus = async () => {
    try {
      const result = await runCommand("gcloud", ["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"]);
      updateStatus(
        "gcloud",
        result.success && result.stdout.trim().length > 0,
        result.message,
        result.stdout.trim().split("\n")[0],
      );
    } catch (error) {
      updateStatus("gcloud", false, String(error));
    }
  };

  const checkAzureStatus = async () => {
    try {
      const result = await runCommand("az", ["account", "show"]);
      let account = "";

      if (result.success && result.stdout) {
        try {
          const data = JSON.parse(result.stdout);
          account = data.user?.name || data.name || "";
        } catch {
          account = result.stdout.split("\n")[0];
        }
      }

      updateStatus("azure", result.success, result.message, account);
    } catch (error) {
      updateStatus("azure", false, String(error));
    }
  };

  const updateStatus = (id: string, isLoggedIn: boolean, message: string, account?: string) => {
    setStatuses((prevStatuses: CloudStatus[]) =>
      prevStatuses.map((status: CloudStatus) =>
        status.id === id ? { ...status, isLoggedIn, isLoading: false, error: message, account } : status,
      ),
    );
  };

  return (
    <List isLoading={isLoading}>
      {statuses.map((status: CloudStatus) => (
        <List.Item
          key={status.id}
          icon={status.icon}
          title={status.name}
          subtitle={status.account ? status.account : status.isLoading ? "Checking..." : undefined}
          accessories={
            status.isLoading
              ? []
              : [
                  {
                    icon: status.isLoggedIn
                      ? { source: Icon.CheckCircle, tintColor: Color.Green }
                      : { source: Icon.XmarkCircle, tintColor: Color.Red },
                    text: status.isLoggedIn ? "Logged In" : "Not Logged In",
                    tooltip: status.error,
                  },
                ]
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Status"
                content={`${status.name}: ${status.isLoggedIn ? `Logged In${status.account ? ` as ${status.account}` : ""}` : "Not Logged In"}`}
              />
              <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={checkCloudStatuses} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
