import { showToast, Toast, Clipboard, open, LaunchProps, getSelectedFinderItems } from "@raycast/api";
import path from "path";
import fs from "fs";
import { AnalysisStats, calculateSha256, getFileReport, getURLReport, uploadFile, getAnalysisStatus } from "./client";

interface Arguments {
  input?: string;
}

// Helper function to show detection results
async function showDetectionResults(
  stats: AnalysisStats,
  title: string,
  resourceType: "file" | "url",
  resourceId: string,
  resourceName?: string,
) {
  const totalEngines = stats.malicious + stats.suspicious + stats.undetected;
  const detectionRate = totalEngines === 0 ? 0 : ((stats.malicious + stats.suspicious) / totalEngines) * 100;

  if (stats.malicious > 0 || stats.suspicious > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: resourceName
        ? `${resourceName}: Detected!`
        : `Detected! ${stats.malicious + stats.suspicious}/${totalEngines} engines`,
      message: resourceName
        ? `${stats.malicious + stats.suspicious}/${totalEngines} engines (${detectionRate.toFixed(2)}%)`
        : `${detectionRate.toFixed(2)}% detection rate. Click to view details.`,
      primaryAction: {
        title: "View Report",
        onAction: () => {
          open(`https://www.virustotal.com/gui/${resourceType}/${resourceId}`);
        },
      },
    });
  } else {
    await showToast({
      style: Toast.Style.Success,
      title: resourceName ? `${resourceName}: Clean` : `${title} is clean`,
      message: "No security vendors flagged this as malicious",
      primaryAction: {
        title: "View Report",
        onAction: () => {
          open(`https://www.virustotal.com/gui/${resourceType}/${resourceId}`);
        },
      },
    });
  }
}

// Simple sleep function
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Check analysis status (polling with max attempts)
async function checkAnalysisUntilComplete(analysisId: string, hash: string, fileName: string): Promise<void> {
  const maxAttempts = 12;
  const intervalMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Get analysis status
      const analysisData = await getAnalysisStatus(analysisId);
      const status = analysisData.data.attributes.status;

      // Show progress toast
      await showToast({
        style: Toast.Style.Animated,
        title: `Analysis in progress (${attempt}/${maxAttempts})`,
        message: `Status: ${status}`,
        primaryAction: {
          title: "View Online",
          onAction: () => {
            open(`https://www.virustotal.com/gui/file/${hash}/detection`);
          },
        },
      });

      // Check if analysis is complete
      if (status === "completed") {
        const stats = analysisData.data.attributes.stats;
        await showDetectionResults(stats, "File", "file", hash, fileName);
        return;
      }

      // Wait before next attempt
      if (attempt < maxAttempts) {
        await sleep(intervalMs);
      }
    } catch (error) {
      console.error("Error checking analysis:", error);

      // If we're on the last attempt and still had an error, show error toast
      if (attempt === maxAttempts) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error checking analysis",
          message: "Please check the results online",
          primaryAction: {
            title: "View Online",
            onAction: () => {
              open(`https://www.virustotal.com/gui/file/${hash}/detection`);
            },
          },
        });
      } else {
        // Otherwise wait and try again
        await sleep(intervalMs);
      }
    }
  }

  // If we've reached max attempts without completion
  await showToast({
    style: Toast.Style.Animated,
    title: "Analysis still in progress",
    message: "Please check online for results",
    primaryAction: {
      title: "View Online",
      onAction: () => {
        open(`https://www.virustotal.com/gui/file/${hash}/detection`);
      },
    },
  });
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { arguments: args } = props;

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Checking with VirusTotal",
    });

    // Priority: 1. Command argument, 2. Selected files in Finder, 3. Clipboard
    let input = args.input?.trim();

    // If no direct argument, check for files selected in Finder
    if (!input) {
      try {
        const selectedItems = await getSelectedFinderItems();

        if (selectedItems && selectedItems.length > 0) {
          if (selectedItems.length > 1) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Multiple files selected",
              message: "Please select only one file to check at a time",
            });
            return;
          }

          const item = selectedItems[0];
          const filePath = item.path;
          const fileName = path.basename(filePath);

          try {
            const fileBuffer = await fs.promises.readFile(filePath);
            const hash = await calculateSha256(fileBuffer);

            const report = await getFileReport(hash);

            if (report === null) {
              await showToast({
                style: Toast.Style.Animated,
                title: "No existing report found",
                message: "Uploading file to VirusTotal for analysis",
              });

              // Upload file and get analysis ID
              const analysisId = await uploadFile(fileBuffer, fileName);

              await showToast({
                style: Toast.Style.Success,
                title: "File uploaded successfully",
                message: "Starting analysis checks...",
                primaryAction: {
                  title: "View Online",
                  onAction: () => {
                    open(`https://www.virustotal.com/gui/file/${hash}/detection`);
                  },
                },
              });

              // Start polling for analysis results
              await checkAnalysisUntilComplete(analysisId, hash, fileName);
              return;
            }

            const stats = report.data.attributes.last_analysis_stats;
            await showDetectionResults(stats, "File", "file", hash, fileName);
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: `Error checking ${fileName}`,
              message: error instanceof Error ? error.message : String(error),
            });
          }
          return;
        }
      } catch (error) {
        // Continue with other input methods if Finder items can't be accessed
        console.log("No Finder items available:", error);
      }
    }

    // If no input yet, try clipboard
    if (!input) {
      input = await Clipboard.readText();
    }

    if (!input) {
      throw new Error("No content to check. Provide a hash, URL, select text/file, or copy content to clipboard.");
    }

    // Check if input looks like a hash or URL
    const isHash = /^[a-fA-F0-9]{32,64}$/.test(input);

    // Basic URL validation to avoid malformed URLs
    const isValidUrl = (urlString: string): boolean => {
      try {
        new URL(urlString);
        return true;
      } catch {
        return false;
      }
    };

    if (isHash) {
      const report = await getFileReport(input);

      // For hashes, we can't upload the file since we don't have the actual file
      if (report === null) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No report found for this hash",
          message: "Select the actual file instead to upload it for analysis",
        });
        return;
      }

      const stats = report.data.attributes.last_analysis_stats;
      await showDetectionResults(stats, "File", "file", input);
    } else {
      if (!isValidUrl(input)) {
        throw new Error("Invalid URL format. Please provide a valid URL.");
      }
      const report = await getURLReport(input);
      const stats = report.data.attributes.last_analysis_stats;
      const urlId = report.data.id;
      await showDetectionResults(stats, "URL", "url", urlId);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error checking with VirusTotal",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
