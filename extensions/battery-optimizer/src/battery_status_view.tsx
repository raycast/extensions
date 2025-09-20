import { ActionPanel, Detail, Action, Icon, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BatteryTool } from "./utils/getPreference";
import { useEffect, useState } from "react";
import { getBatteryTool } from "./utils/batteryTools";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { getBatteryToolPath } from "./utils/batteryTools";

export default function Command() {
  const [status, setStatus] = useState<string>("Loading...");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the selected battery tool once
  const currentTool = getBatteryTool();

  // Check if BATT is selected
  useEffect(() => {
    if (currentTool !== BatteryTool.BATT) {
      setError("This command is for BATT only. Please use Get Battery Threshold for BCLM.");
      showHUD("This command is for BATT only. Please use Get Battery Threshold for BCLM.");
    }
  }, []);

  async function fetchBatteryStatus() {
    setIsLoading(true);

    // Skip fetching if wrong tool is selected
    if (currentTool !== BatteryTool.BATT) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await getBatteryStatusDirect();
      if (result && result.trim() !== "") {
        setStatus(result);
        setError(null);
      } else {
        throw new Error("Empty response received from battery tool command");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Battery status error:", errorMessage);
      setError(errorMessage);
      setStatus("Error fetching battery status");
      showFailureToast(error, { title: "Failed to get battery status" });
    } finally {
      setIsLoading(false);
    }
  }

  // Direct implementation based on the original getBatteryStatus function
  async function getBatteryStatusDirect(): Promise<string> {
    try {
      const toolCmd = await getBatteryToolPath();
      const command = currentTool === BatteryTool.BCLM ? "read" : "status";

      console.log(`Using battery tool: ${currentTool} (${toolCmd} ${command})`);

      // Try a direct approach with osascript first
      try {
        console.log("Using osascript to run command...");
        const tempOutputFile = `/tmp/battery_status_${Date.now()}.txt`;
        const osascriptCmd = `/usr/bin/osascript -e 'do shell script "${toolCmd} ${command} > ${tempOutputFile} 2>&1"'`;

        // Execute the command via osascript
        execSync(osascriptCmd, { encoding: "utf8" });

        // Read the output from the temporary file
        if (existsSync(tempOutputFile)) {
          const output = readFileSync(tempOutputFile, "utf8").trim();

          // Clean up the temporary file
          try {
            unlinkSync(tempOutputFile);
          } catch {
            /* ignore cleanup errors */
          }

          if (output && output.trim() !== "") {
            console.log(`Successfully got output via osascript, length: ${output.length}`);
            return output;
          }
        }

        console.log("osascript approach produced no output");
      } catch (osascriptError) {
        console.error(
          "osascript approach failed:",
          osascriptError instanceof Error ? osascriptError.message : String(osascriptError),
        );
      }

      // Try direct execution
      try {
        console.log("Trying direct execution...");
        const output = execSync(`${toolCmd} ${command}`, {
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH || ""}`,
          },
        })
          .toString()
          .trim();

        console.log(`Direct execution output: ${output.substring(0, 300)}`);
        return output;
      } catch (execError) {
        console.error("Direct execution failed:", execError);
      }

      // Use system command as fallback
      console.log("Using pmset as fallback...");
      const pmsetOutput = execSync("pmset -g batt", { encoding: "utf8" }).toString().trim();
      console.log(`pmset output: ${pmsetOutput}`);
      if (pmsetOutput) {
        return `Battery status (from system):\n${pmsetOutput}\n\nNote: Retrieved from system as ${currentTool} command is not returning data.`;
      }

      throw new Error(`Could not get battery status using ${currentTool}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unknown error: ${String(error)}`;
      console.error("Failed to get battery status:", errorMessage);
      throw new Error(`Failed to get battery status: ${errorMessage}`);
    }
  }

  useEffect(() => {
    fetchBatteryStatus();

    // Refresh every 60 seconds
    const interval = setInterval(fetchBatteryStatus, 60000);
    return () => clearInterval(interval);
  }, [currentTool]);

  // Format the battery status for better display in Raycast
  let formattedMarkdown;
  if (error) {
    formattedMarkdown = `# Error\n\n**Error Message:** ${error}\n\n## Troubleshooting\n\n1. Make sure the battery management CLI is installed\n2. Try running the command directly in Terminal\n3. Provide a custom path in extension preferences if needed`;
  } else {
    // Use pre-formatted text to preserve the exact formatting from the command
    formattedMarkdown = `# Battery Status\n\n\`\`\`\n${status}\n\`\`\``;
  }

  return (
    <Detail
      markdown={formattedMarkdown}
      isLoading={isLoading}
      navigationTitle="Battery Status"
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => fetchBatteryStatus()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Using" text={currentTool.toUpperCase()} />
          <Detail.Metadata.Label
            title="Command"
            text={`${currentTool} ${currentTool === BatteryTool.BCLM ? "read" : "status"}`}
          />
          {error && (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text="Error" color="#FF0000" />
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}
