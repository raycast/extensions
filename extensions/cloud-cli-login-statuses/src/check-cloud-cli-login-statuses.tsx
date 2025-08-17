import { ActionPanel, Action, Icon, List, showToast, Toast, Color, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { execa } from "execa";
import path from "path";
import os from "os";
import fs from "fs";

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
    envVars?: Record<string, string>,
  ): Promise<{ success: boolean; message: string; stdout: string }> => {
    try {
      const cmdPath = await execa("which", [cmd], {
        env: { PATH: getEnhancedPath() },
      })
        .then((r) => r.stdout.trim())
        .catch(() => cmd);

      console.log(`Running ${cmdPath} with args: ${args.join(" ")}`);

      const result = await execa(cmdPath, args, {
        env: { PATH: getEnhancedPath(), ...(envVars || {}) },
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
      // First try: Standard credentials check
      let result = await runCommand("aws", ["sts", "get-caller-identity"]);
      let profileName = "default";

      // If failed, try with available profiles
      if (!result.success) {
        try {
          // Get list of available profiles
          const profilesResult = await runCommand("aws", ["configure", "list-profiles"]);

          if (profilesResult.success && profilesResult.stdout.trim()) {
            const profiles = profilesResult.stdout.trim().split("\n");

            // Try each profile until one works
            for (const profile of profiles) {
              const trimmedProfile = profile.trim();
              if (trimmedProfile) {
                console.log(`Trying AWS profile: ${trimmedProfile}`);
                const profileResult = await runCommand("aws", ["sts", "get-caller-identity"], {
                  AWS_PROFILE: trimmedProfile,
                });

                if (profileResult.success) {
                  console.log(`Successfully authenticated with profile: ${trimmedProfile}`);
                  result = profileResult;
                  profileName = trimmedProfile;
                  break; // Stop after finding first working profile
                }
              }
            }
          }
        } catch (error) {
          console.error("Error checking AWS profiles:", error);
        }
      }

      let account = "";
      if (result.success && result.stdout) {
        account = profileName;
      }

      updateStatus("aws", result.success, result.message, account);
    } catch (error) {
      updateStatus("aws", false, String(error));
    }
  };

  const checkGcloudStatus = async () => {
    try {
      // First try: Standard auth list
      const result = await runCommand("gcloud", ["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"]);
      let isLoggedIn = result.success && result.stdout.trim().length > 0;
      let account = result.stdout.trim().split("\n")[0];

      // If not logged in via standard auth, check application-default credentials
      if (!isLoggedIn) {
        try {
          // Check if application-default credentials file exists
          const adcPath = path.join(os.homedir(), ".config/gcloud/application_default_credentials.json");
          const adcExists = fs.existsSync(adcPath);

          if (adcExists) {
            // Try to get token to verify the credentials work
            const tokenResult = await runCommand("gcloud", ["auth", "application-default", "print-access-token"]);
            if (tokenResult.success && tokenResult.stdout.trim()) {
              isLoggedIn = true;
              account = "Application Default Credentials";
            }
          }
        } catch (error) {
          console.error("Error checking GCloud application-default credentials:", error);
        }
      }

      updateStatus("gcloud", isLoggedIn, result.message, account);
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
